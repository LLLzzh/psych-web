

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

export class ASRService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private config: ASRConfig | null = null;
  private onResult: ((text: string) => void) | null = null;
  private sendAudioASR: ((audioData: Uint8Array) => Promise<void>) | null = null;
  
  // PCM录音相关
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private chunkInterval: number | null = null;
  private currentChunk: Uint8Array[] = [];
  private recordedPcmChunks: Uint8Array[] = [];
  private recordedMediaChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private lastVoiceAt = 0;
  private hasVoiceInSegment = false;
  private segmentSwitching = false;

  private static readonly SILENCE_RMS_THRESHOLD = 0.012;
  private static readonly AUTO_SEGMENT_SILENCE_MS = 1200;

  constructor() {
    this.audioChunks = [];
    this.isRecording = false;
  }

  // 初始化ASR服务
  initialize(
    config: ASRConfig, 
    onResult: (text: string) => void,
    sendAudioASR: (audioData: Uint8Array) => Promise<void>
  ) {
    this.config = config;
    this.onResult = onResult;
    this.sendAudioASR = sendAudioASR;
  }

  // 处理服务器返回的ASR结果
  handleASRResult(text: string): void {
    if (this.onResult) {
      this.onResult(text);
    }
  }

  // 检查是否支持录音
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

  // 发送ASR开始标识
  private async sendASRStartSignal(): Promise<void> {
    if (this.sendAudioASR) {
      const startSignal = new Uint8Array([0]); // FirstASR byte = 0 标识开始
      await this.sendAudioASR(startSignal);
    }
  }

  // 发送ASR结束标识
  private async sendASREndSignal(): Promise<void> {
    if (this.sendAudioASR) {
      const endSignal = new Uint8Array([255]); // LastASR byte = 255 标识结束
      await this.sendAudioASR(endSignal);
    }
  }

  // 开始录音
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
      this.lastVoiceAt = Date.now();
      this.hasVoiceInSegment = false;
      this.segmentSwitching = false;

      // 先通知后端开启ASR段，再启动分包发送，确保时序正确
      await this.sendASRStartSignal();

      // 根据配置选择录音方式
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

  // 停止录音
  async stopRecording(): Promise<void> {
    if (this.isRecording) {
      this.isRecording = false;
      this.segmentSwitching = false;
      
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

      // 停止后回放本次录音，便于快速验证采集链路是否正常
      if (CONFIG.PLAY_LOCAL_RECORDING && this.config?.format.toLowerCase() === "pcm") {
        this.playRecordedPCM();
      }
    }
  }

  // 启动PCM录音
  private async startPCMRecording(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: this.config!.rate });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      
      // 创建ScriptProcessorNode来获取原始PCM数据
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        if (rms >= ASRService.SILENCE_RMS_THRESHOLD) {
          this.lastVoiceAt = Date.now();
          this.hasVoiceInSegment = true;
        }

        // 将Float32Array转换为Int16Array (16位PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // 转换为Uint8Array
        const uint8Array = new Uint8Array(pcmData.buffer);
        this.currentChunk.push(uint8Array);
      };
      
      // 连接音频节点
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      // 启动200ms分包定时器
      this.startChunking();
      
    } catch (error) {
      console.error("启动PCM录音失败:", error);
      throw error;
    }
  }

  // 启动MediaRecorder录音（兼容其他格式）
  private async startMediaRecorderRecording(stream: MediaStream): Promise<void> {
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.recordedMediaChunks.push(event.data);
        this.sendAudioChunkDirectly(event.data);
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

  // 停止PCM录音
  private async stopPCMRecording(): Promise<void> {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
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
    
    // 发送最后一个音频块
    if (this.currentChunk.length > 0) {
      await this.sendPCMChunk();
    }
  }

  // 启动200ms分包定时器
  private startChunking(): void {
    this.chunkInterval = window.setInterval(() => {
      if (!this.isRecording) {
        return;
      }

      if (this.currentChunk.length > 0) {
        void this.sendPCMChunk();
      }

      const silentFor = Date.now() - this.lastVoiceAt;
      if (
        this.config?.resultType?.toLowerCase() !== "single" &&
        this.hasVoiceInSegment &&
        !this.segmentSwitching &&
        silentFor >= ASRService.AUTO_SEGMENT_SILENCE_MS
      ) {
        void this.rotateASRSegment();
      }
    }, 200);
  }

  // 静音分段：不停止录音，仅结束上一轮ASR并开启下一轮
  private async rotateASRSegment(): Promise<void> {
    if (!this.isRecording || this.segmentSwitching) {
      return;
    }
    this.segmentSwitching = true;
    try {
      if (this.currentChunk.length > 0) {
        await this.sendPCMChunk();
      }
      await this.sendASREndSignal();
      if (!this.isRecording) {
        return;
      }
      await this.sendASRStartSignal();
      this.hasVoiceInSegment = false;
      this.lastVoiceAt = Date.now();
    } catch (error) {
      console.error("切换ASR分段失败:", error);
    } finally {
      this.segmentSwitching = false;
    }
  }

  // 发送PCM音频块
  private async sendPCMChunk(): Promise<void> {
    if (this.currentChunk.length === 0 || !this.sendAudioASR) {
      return;
    }

    try {
      // 合并所有PCM数据
      const totalLength = this.currentChunk.reduce((sum, chunk) => sum + chunk.length, 0);
      const mergedData = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of this.currentChunk) {
        mergedData.set(chunk, offset);
        offset += chunk.length;
      }
      
      // 发送音频块到服务器
      await this.sendAudioASR(mergedData);

      // 额外保存一份本地录音，用于结束后回放
      this.recordedPcmChunks.push(new Uint8Array(mergedData));
      
      // 清空当前块
      this.currentChunk = [];
    } catch (error) {
      console.error("发送PCM音频块失败:", error);
    }
  }

  // 直接发送音频块（由MediaRecorder的timeslice触发）
  private async sendAudioChunkDirectly(audioBlob: Blob): Promise<void> {
    if (!this.sendAudioASR) {
      return;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 发送音频块到服务器
      await this.sendAudioASR(uint8Array);
    } catch (error) {
      console.error("发送音频块失败:", error);
    }
  }

  // 获取MIME类型
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

  // 处理录音数据
  private async processAudio(): Promise<void> {
    // 发送ASR结束标识
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

  // 获取录音状态
  getRecordingState(): boolean {
    return this.isRecording;
  }

  // 销毁服务
  destroy(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    // 清理PCM资源
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
    this.isRecording = false;
    this.config = null;
    this.onResult = null;
    this.sendAudioASR = null;
  }
}
