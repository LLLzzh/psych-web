import { CONFIG } from "../config";

export interface ASRConfig {
  id: string;
  format: string;
  codec: string;
  rate: number;
  bits: number;
  channels: number;
  resultType: string;
}

export interface ASRServiceOptions {
  onVolumeChange?: (rms: number) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

const VAD_SPEECH_THRESHOLD = 0.015;
const VAD_SILENCE_THRESHOLD = 0.012;
const VAD_ONSET_FRAMES = 3;
const VAD_PREFETCH_SIZE = 2;

export class ASRService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private config: ASRConfig | null = null;
  private onResult: ((text: string) => void) | null = null;
  private sendAudioASR: ((audioData: Uint8Array) => Promise<void>) | null = null;

  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private chunkInterval: number | null = null;
  private currentChunk: Uint8Array[] = [];
  private recordedPcmChunks: Uint8Array[] = [];
  private recordedMediaChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onVolumeChange: ((rms: number) => void) | null = null;
  private smoothedRms = 0;
  private volumeUpdateAt = 0;

  // Continuous mode / VAD state
  private isContinuousMode = false;
  private isSpeaking = false;
  private vadConsecutiveFrames = 0;
  private prefetchBuffer: Uint8Array[] = [];
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;
  private vadCooldownUntil = 0; // 防抖：发送结束信号后的冷却期，防止立即检测到新语音
  private silenceStartedAt = 0;
  private localStopInFlight = false;

  private static readonly VOLUME_UPDATE_INTERVAL_MS = 67; // ~15 Hz
  private static readonly VAD_COOLDOWN_MS = 500; // 发送结束信号后 500ms 内不检测新语音
  private static readonly LOCAL_VAD_OFF_MS = 1500; // 本地兜底：连续静音 1.5s 判定说话结束

  constructor() {
    this.audioChunks = [];
    this.isRecording = false;
  }

  initialize(
    config: ASRConfig,
    onResult: (text: string) => void,
    sendAudioASR: (audioData: Uint8Array) => Promise<void>,
    options?: ASRServiceOptions
  ) {
    this.config = config;
    this.onResult = onResult;
    this.sendAudioASR = sendAudioASR;
    this.onVolumeChange = options?.onVolumeChange ?? null;
    this.onSpeakingChange = options?.onSpeakingChange ?? null;
  }

  handleASRResult(text: string): void {
    if (this.onResult) {
      this.onResult(text);
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("无法获取麦克风权限:", error);
      return false;
    }
  }

  private async sendASRStartSignal(): Promise<void> {
    if (this.sendAudioASR) {
      const startSignal = new Uint8Array([0]);
      await this.sendAudioASR(startSignal);
    }
  }

  private async sendASREndSignal(): Promise<void> {
    if (this.sendAudioASR) {
      console.info("[ASR] >>> 发送 ASR 结束信号 [255]（本段语音结束，非对话结束）");
      const endSignal = new Uint8Array([255]);
      await this.sendAudioASR(endSignal);
    }
  }

  // -----------------------------------------------------------------------
  // Legacy single-shot recording (kept for non-continuous callers)
  // -----------------------------------------------------------------------

  async startRecording(): Promise<boolean> {
    if (!this.config) {
      console.error("ASR服务未初始化");
      return false;
    }

    if (this.isRecording) {
      console.warn("已在录音中");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.rate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      this.audioChunks = [];
      this.currentChunk = [];
      this.recordedPcmChunks = [];
      this.recordedMediaChunks = [];
      this.stream = stream;
      this.isRecording = true;
      this.smoothedRms = 0;
      this.volumeUpdateAt = 0;

      await this.sendASRStartSignal();

      if (this.config.format.toLowerCase() === 'pcm') {
        await this.startPCMRecording(stream);
      } else {
        await this.startMediaRecorderRecording(stream);
      }

      return true;
    } catch (error) {
      console.error("开始录音失败:", error);
      this.isRecording = false;
      return false;
    }
  }

  async stopRecording(): Promise<void> {
    if (this.isContinuousMode) {
      await this.stopContinuousRecording();
      return;
    }

    if (this.isRecording) {
      this.isRecording = false;

      if (this.config?.format.toLowerCase() === 'pcm') {
        await this.stopPCMRecording();
        await this.sendASREndSignal();
      } else if (this.mediaRecorder) {
        this.mediaRecorder.stop();
      } else {
        await this.sendASREndSignal();
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      this.onVolumeChange?.(0);

      if (CONFIG.PLAY_LOCAL_RECORDING && this.config?.format.toLowerCase() === "pcm") {
        this.playRecordedPCM();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Continuous mode – mic stays open, VAD gates audio sending
  // -----------------------------------------------------------------------

  async startContinuousRecording(): Promise<boolean> {
    if (!this.config) {
      console.error("ASR服务未初始化");
      return false;
    }

    if (this.isRecording) {
      console.warn("已在录音中");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.rate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      this.audioChunks = [];
      this.currentChunk = [];
      this.recordedPcmChunks = [];
      this.recordedMediaChunks = [];
      this.prefetchBuffer = [];
      this.stream = stream;
      this.isRecording = true;
      this.isContinuousMode = true;
      this.isSpeaking = false;
      this.vadConsecutiveFrames = 0;
      this.silenceStartedAt = 0;
      this.localStopInFlight = false;
      this.smoothedRms = 0;
      this.volumeUpdateAt = 0;

      if (this.config.format.toLowerCase() === 'pcm') {
        await this.startPCMRecording(stream);
      } else {
        await this.startMediaRecorderRecording(stream);
      }

      console.info("[ASR] Continuous mode started, VAD listening");
      return true;
    } catch (error) {
      console.error("开始连续录音失败:", error);
      this.isRecording = false;
      this.isContinuousMode = false;
      return false;
    }
  }

  async stopContinuousRecording(): Promise<void> {
    if (!this.isRecording) return;
    
    console.info("[ASR] 停止连续录音，isSpeaking=", this.isSpeaking);

    // 用户手动停止时，如果正在说话，需要发送结束信号
    if (this.isSpeaking) {
      if (this.currentChunk.length > 0) {
        await this.sendPCMChunk();
      }
      console.info("[ASR] 用户手动停止，发送结束信号");
      await this.sendASREndSignal();
      this.isSpeaking = false;
      this.onSpeakingChange?.(false);
    }

    this.isRecording = false;
    this.isContinuousMode = false;
    this.vadConsecutiveFrames = 0;
    this.silenceStartedAt = 0;
    this.localStopInFlight = false;
    this.prefetchBuffer = [];

    if (this.config?.format.toLowerCase() === 'pcm') {
      await this.stopPCMRecording();
    } else if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.onVolumeChange?.(0);
    console.info("[ASR] 连续模式已停止，麦克风已关闭");
  }

  /**
   * Called when backend sends ASRStop (type 4): 后端检测到800ms静音.
   * 直接发送ASR结束信号，重置到 VAD 监听状态等待用户再次说话.
   * 注意：这只是一段语音的结束，不是整个对话的结束，麦克风仍然开着.
   */
  async handleServerStop(): Promise<void> {
    console.info("[ASR] <<< 收到后端 ASRStop (800ms静音)，isContinuousMode=", this.isContinuousMode, "isSpeaking=", this.isSpeaking);
    
    if (!this.isContinuousMode) {
      console.info("[ASR] 非连续模式，忽略");
      return;
    }

    // 先停止 chunking 定时器，防止后续再发送数据
    this.stopChunking();

    // 立即将 isSpeaking 设为 false，防止新的音频数据进入 currentChunk
    const wasSpeak = this.isSpeaking;
    this.isSpeaking = false;

    // 直接发送 ASR 结束信号，不再发送剩余音频
    if (wasSpeak) {
      await this.sendASREndSignal();
    }

    // 设置 VAD 冷却期，防止发送结束信号后立即检测到新语音（例如回声或噪音）
    this.vadCooldownUntil = performance.now() + ASRService.VAD_COOLDOWN_MS;

    // 重置状态，继续 VAD 监听，等待用户再次说话
    this.vadConsecutiveFrames = 0;
    this.prefetchBuffer = [];
    this.currentChunk = [];
    this.silenceStartedAt = 0;
    this.localStopInFlight = false;
    this.onSpeakingChange?.(false);

    console.info("[ASR] ASR 结束信号已发送，回到 VAD 监听，等待用户再次说话");
  }

  getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  getContinuousMode(): boolean {
    return this.isContinuousMode;
  }

  // -----------------------------------------------------------------------
  // PCM recording – AudioWorklet with ScriptProcessorNode fallback
  // -----------------------------------------------------------------------

  private async startPCMRecording(stream: MediaStream): Promise<void> {
    try {
      const audioCtx = new AudioContext({ sampleRate: this.config!.rate });
      this.audioContext = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      console.info("[ASR] AudioContext state:", audioCtx.state, "sampleRate:", audioCtx.sampleRate);

      const source = audioCtx.createMediaStreamSource(stream);
      this.mediaStreamSource = source;

      const tracks = stream.getAudioTracks();
      console.info("[ASR] Audio tracks:", tracks.length, tracks.map(t => `${t.label} enabled=${t.enabled} muted=${t.muted}`));

      let workletLoaded = false;
      try {
        const base = import.meta.env.BASE_URL || '/';
        await audioCtx.audioWorklet.addModule(`${base}pcm-worklet-processor.js`);

        if (!this.isRecording) return;

        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        this.workletNode = new AudioWorkletNode(audioCtx, 'pcm-worklet-processor');

        this.workletNode.port.onmessage = (event: MessageEvent) => {
          if (!this.isRecording) return;
          const { pcmData, rms } = event.data as { pcmData: Uint8Array; rms: number };
          this.handleAudioData(new Uint8Array(pcmData), rms);
        };

        source.connect(this.workletNode);
        this.workletNode.connect(audioCtx.destination);
        workletLoaded = true;
        console.info("[ASR] AudioWorklet loaded and connected");
      } catch (e) {
        console.warn('[ASR] AudioWorklet unavailable, falling back to ScriptProcessor', e);
      }

      if (!this.isRecording) return;

      if (!workletLoaded) {
        this.setupScriptProcessorFallback(audioCtx, source);
        console.info("[ASR] ScriptProcessor fallback connected");
      }

      // In continuous mode, chunking is started on-demand when VAD detects speech
      if (!this.isContinuousMode) {
        this.startChunking();
      }
    } catch (error) {
      console.error("启动PCM录音失败:", error);
      throw error;
    }
  }

  private setupScriptProcessorFallback(
    audioCtx: AudioContext,
    source: MediaStreamAudioSourceNode
  ): void {
    this.scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isRecording) return;

      const inputData = event.inputBuffer.getChannelData(0);
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);

      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }

      this.handleAudioData(new Uint8Array(pcmData.buffer), rms);
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(audioCtx.destination);
  }

  private handleAudioData(pcmData: Uint8Array, rms: number): void {
    this.smoothedRms = this.smoothedRms * 0.7 + rms * 0.3;
    const now = performance.now();
    if (now - this.volumeUpdateAt >= ASRService.VOLUME_UPDATE_INTERVAL_MS) {
      this.volumeUpdateAt = now;
      this.onVolumeChange?.(this.smoothedRms);
    }

    if (this.isContinuousMode) {
      if (!this.isSpeaking) {
        // VAD listening: buffer audio and watch for speech onset
        this.prefetchBuffer.push(new Uint8Array(pcmData));
        if (this.prefetchBuffer.length > VAD_PREFETCH_SIZE) {
          this.prefetchBuffer.shift();
        }

        // 检查是否在冷却期内（发送结束信号后的短时间内不检测新语音）
        if (now < this.vadCooldownUntil) {
          this.vadConsecutiveFrames = 0;
          return;
        }

        if (this.smoothedRms >= VAD_SPEECH_THRESHOLD) {
          this.vadConsecutiveFrames++;
          if (this.vadConsecutiveFrames >= VAD_ONSET_FRAMES) {
            void this.transitionToSpeaking();
          }
        } else {
          this.vadConsecutiveFrames = 0;
        }
        return;
      }

      // Speaking: accumulate for chunked sending
      this.currentChunk.push(pcmData);
      if (this.smoothedRms < VAD_SILENCE_THRESHOLD) {
        if (this.silenceStartedAt === 0) {
          this.silenceStartedAt = now;
        } else if (
          !this.localStopInFlight &&
          now - this.silenceStartedAt >= ASRService.LOCAL_VAD_OFF_MS
        ) {
          this.localStopInFlight = true;
          void this.transitionToListeningByLocalSilence();
        }
      } else {
        this.silenceStartedAt = 0;
      }
      return;
    }

    // Legacy (non-continuous) path
    this.currentChunk.push(pcmData);
  }

  /**
   * VAD 检测到语音开始（静音→说话）: 发送开始信号，开始发送音频.
   * 前端只负责"开始"检测，"结束"由后端负责.
   */
  private async transitionToSpeaking(): Promise<void> {
    console.info("[ASR] VAD 检测到用户开始说话（静音→说话）");
    
    this.isSpeaking = true;
    this.vadConsecutiveFrames = 0;
    this.silenceStartedAt = 0;
    this.localStopInFlight = false;

    // 发送开始信号
    console.info("[ASR] >>> 发送开始信号 [0]");
    await this.sendASRStartSignal();

    // Flush pre-buffered audio so the beginning of speech isn't lost
    if (this.prefetchBuffer.length > 0) {
      for (const chunk of this.prefetchBuffer) {
        this.currentChunk.push(chunk);
      }
      this.prefetchBuffer = [];
    }

    this.startChunking();
    this.onSpeakingChange?.(true);
  }

  // -----------------------------------------------------------------------
  // MediaRecorder recording (non-PCM formats)
  // -----------------------------------------------------------------------

  private async startMediaRecorderRecording(stream: MediaStream): Promise<void> {
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.recordedMediaChunks.push(event.data);
        if (!this.isContinuousMode || this.isSpeaking) {
          this.sendAudioChunkDirectly(event.data);
        }
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processAudio();
      if (CONFIG.PLAY_LOCAL_RECORDING) {
        this.playRecordedMedia();
      }
      stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.start(200);
  }

  // -----------------------------------------------------------------------
  // Stop / chunking / segment rotation
  // -----------------------------------------------------------------------

  private async stopPCMRecording(): Promise<void> {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.currentChunk.length > 0) {
      await this.sendPCMChunk();
    }
  }

  private startChunking(): void {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
    }

    this.chunkInterval = window.setInterval(() => {
      if (!this.isRecording) {
        return;
      }

      // In continuous mode, only send chunks while speaking
      if (this.isContinuousMode && !this.isSpeaking) {
        return;
      }

      if (this.currentChunk.length > 0) {
        void this.sendPCMChunk();
      }
    }, 200);
  }

  private stopChunking(): void {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }
  }

  /**
   * 本地静音兜底：当后端未及时返回 ASRStop 时，连续静音达阈值后主动结束本段语音。
   */
  private async transitionToListeningByLocalSilence(): Promise<void> {
    if (!this.isContinuousMode || !this.isSpeaking) {
      this.localStopInFlight = false;
      return;
    }

    console.info("[ASR] 本地 VAD_OFF 触发（连续静音），主动结束本段语音");
    this.stopChunking();

    try {
      if (this.currentChunk.length > 0) {
        await this.sendPCMChunk();
      }
      await this.sendASREndSignal();
    } finally {
      this.isSpeaking = false;
      this.vadConsecutiveFrames = 0;
      this.prefetchBuffer = [];
      this.currentChunk = [];
      this.silenceStartedAt = 0;
      this.localStopInFlight = false;
      this.vadCooldownUntil = performance.now() + ASRService.VAD_COOLDOWN_MS;
      this.onSpeakingChange?.(false);
    }
  }

  // -----------------------------------------------------------------------
  // Audio data transmission
  // -----------------------------------------------------------------------

  private async sendPCMChunk(): Promise<void> {
    if (this.currentChunk.length === 0 || !this.sendAudioASR) {
      return;
    }

    try {
      const totalLength = this.currentChunk.reduce((sum, chunk) => sum + chunk.length, 0);
      const mergedData = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of this.currentChunk) {
        mergedData.set(chunk, offset);
        offset += chunk.length;
      }

      await this.sendAudioASR(mergedData);
      this.recordedPcmChunks.push(new Uint8Array(mergedData));
      this.currentChunk = [];
    } catch (error) {
      console.error("发送PCM音频块失败:", error);
    }
  }

  private async sendAudioChunkDirectly(audioBlob: Blob): Promise<void> {
    if (!this.sendAudioASR) {
      return;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await this.sendAudioASR(uint8Array);
    } catch (error) {
      console.error("发送音频块失败:", error);
    }
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  private getMimeType(): string {
    if (!this.config) return "audio/webm";

    const { format, codec } = this.config;

    switch (format.toLowerCase()) {
      case "webm":
        return `audio/webm;codecs=${codec}`;
      case "mp4":
        return `audio/mp4;codecs=${codec}`;
      case "wav":
        return "audio/wav";
      default:
        return "audio/webm";
    }
  }

  private async processAudio(): Promise<void> {
    if (this.sendAudioASR) {
      await this.sendASREndSignal();
    } else {
      console.error("sendAudioASR函数未设置");
    }
  }

  private playRecordedPCM(): void {
    if (!this.config || this.recordedPcmChunks.length === 0) {
      return;
    }

    const blob = this.buildWavBlobFromPCM(
      this.recordedPcmChunks,
      this.config.rate,
      this.config.channels,
      this.config.bits
    );
    if (!blob) {
      return;
    }

    this.playBlob(blob);
  }

  private playRecordedMedia(): void {
    if (this.recordedMediaChunks.length === 0) {
      return;
    }
    const mimeType = this.getMimeType();
    const blob = new Blob(this.recordedMediaChunks, { type: mimeType });
    this.playBlob(blob);
  }

  private playBlob(blob: Blob): void {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.autoplay = true;
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    void audio.play().catch(() => {
      URL.revokeObjectURL(audioUrl);
    });
  }

  private buildWavBlobFromPCM(
    pcmChunks: Uint8Array[],
    sampleRate: number,
    channels: number,
    bitsPerSample: number
  ): Blob | null {
    if (bitsPerSample !== 16) {
      console.warn(`暂不支持 ${bitsPerSample} 位本地回放，当前仅支持16位PCM`);
      return null;
    }

    const dataLength = pcmChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    if (dataLength === 0) {
      return null;
    }

    const wavBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(wavBuffer);

    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    const wavData = new Uint8Array(wavBuffer);
    let offset = 44;
    for (const chunk of pcmChunks) {
      wavData.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  destroy(): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.audioChunks = [];
    this.currentChunk = [];
    this.prefetchBuffer = [];
    this.isRecording = false;
    this.isContinuousMode = false;
    this.isSpeaking = false;
    this.vadConsecutiveFrames = 0;
    this.silenceStartedAt = 0;
    this.localStopInFlight = false;
    this.config = null;
    this.onResult = null;
    this.sendAudioASR = null;
    this.onVolumeChange = null;
    this.onSpeakingChange = null;
  }
}
