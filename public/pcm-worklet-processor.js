/**
 * AudioWorklet processor for PCM recording.
 * Accumulates 512 frames before flushing to reduce message overhead
 * while providing ~32ms latency at 16kHz for responsive volume visualization.
 */
class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(512);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    let i = 0;

    while (i < channelData.length) {
      const space = this._buffer.length - this._offset;
      const toCopy = Math.min(channelData.length - i, space);

      for (let j = 0; j < toCopy; j++) {
        this._buffer[this._offset + j] = channelData[i + j];
      }
      this._offset += toCopy;
      i += toCopy;

      if (this._offset >= this._buffer.length) {
        this._flush();
      }
    }

    return true;
  }

  _flush() {
    let sumSquares = 0;
    for (let i = 0; i < this._offset; i++) {
      sumSquares += this._buffer[i] * this._buffer[i];
    }
    const rms = Math.sqrt(sumSquares / this._offset);

    const pcmData = new Int16Array(this._offset);
    for (let i = 0; i < this._offset; i++) {
      const s = Math.max(-1, Math.min(1, this._buffer[i]));
      pcmData[i] = s < 0 ? s * 32768 : s * 32767;
    }

    this.port.postMessage({
      pcmData: new Uint8Array(pcmData.buffer),
      rms,
    });

    this._offset = 0;
  }
}

registerProcessor('pcm-worklet-processor', PCMWorkletProcessor);
