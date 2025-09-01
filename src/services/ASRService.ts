

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
    console.log("ASR服务已初始化:", config);
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
      console.log("已发送ASR开始标识");
    }
  }

  // 发送ASR结束标识
  private async sendASREndSignal(): Promise<void> {
    if (this.sendAudioASR) {
      const endSignal = new Uint8Array([255]); // LastASR byte = 255 标识结束
      await this.sendAudioASR(endSignal);
      console.log("已发送ASR结束标识");
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
      this.isRecording = true;

      // 创建MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getMimeType(),
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          // 每个200ms的数据块直接发送，不需要再收集到currentChunk
          this.sendAudioChunkDirectly(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudio();
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
      };

      // 启动MediaRecorder，每200ms触发一次ondataavailable事件
      this.mediaRecorder.start(200);
      console.log("开始录音，每200ms分包");
      
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
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log("停止录音");
      // 注意：ASR结束标识将在processAudio中发送，确保在音频数据发送后再发送
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

      console.log("发送音频块，大小:", uint8Array.length, "bytes");
      
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
      console.log("ASR录音结束，已发送结束标识");
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
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.config = null;
    this.onResult = null;
    this.sendAudioASR = null;
  }
}
