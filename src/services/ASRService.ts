

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
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudio();
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      console.log("开始录音");
      return true;

    } catch (error) {
      console.error("开始录音失败:", error);
      this.isRecording = false;
      return false;
    }
  }

  // 停止录音
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log("停止录音");
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
    if (this.audioChunks.length === 0) {
      console.warn("没有录音数据");
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.getMimeType() });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log("录音数据大小:", uint8Array.length, "bytes");
      
      // 发送音频数据到服务器进行ASR处理
      if (this.sendAudioASR) {
        await this.sendAudioASR(uint8Array);
        console.log("音频数据已发送到服务器进行ASR处理");
      } else {
        console.error("sendAudioASR函数未设置");
      }

    } catch (error) {
      console.error("处理录音数据失败:", error);
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
