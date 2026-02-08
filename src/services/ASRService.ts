

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
      this.isRecording = true;

      // 根据配置选择录音方式
      if (this.config.format.toLowerCase() === 'pcm') {
        await this.startPCMRecording(stream);
      } else {
        await this.startMediaRecorderRecording(stream);
      }
      
      // 发送ASR开始标识
      await this.sendASRStartSignal();
      
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
      
      if (this.config?.format.toLowerCase() === 'pcm') {
        this.stopPCMRecording();
      } else if (this.mediaRecorder) {
        this.mediaRecorder.stop();
      }
      
      // 注意：ASR结束标识将在processAudio中发送，确保在音频数据发送后再发送
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
        this.sendAudioChunkDirectly(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processAudio();
      stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.start(200);
  }

  // 停止PCM录音
  private stopPCMRecording(): void {
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
      this.sendPCMChunk();
    }
  }

  // 启动200ms分包定时器
  private startChunking(): void {
    this.chunkInterval = window.setInterval(() => {
      if (this.currentChunk.length > 0) {
        this.sendPCMChunk();
      }
    }, 200);
  }

  // 发送PCM音频块
  private sendPCMChunk(): void {
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
      this.sendAudioASR(mergedData);
      
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
    
    this.audioChunks = [];
    this.currentChunk = [];
    this.isRecording = false;
    this.config = null;
    this.onResult = null;
    this.sendAudioASR = null;
  }
}
