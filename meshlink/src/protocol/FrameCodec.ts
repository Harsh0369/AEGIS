/**
 * MeshLink — Length-Prefixed Frame Codec
 *
 * TCP provides a byte stream, NOT message boundaries.
 * This codec handles:
 * - Encoding: prepends a 4-byte big-endian length prefix to each message
 * - Decoding: accumulates chunks, extracts complete frames, handles partial/multiple frames
 *
 * Frame format:
 * ┌──────────────────┬────────────────────────────┐
 * │  4 bytes (BE)    │  N bytes                   │
 * │  payload length  │  JSON-encoded packet       │
 * └──────────────────┴────────────────────────────┘
 */

import { FRAME_HEADER_SIZE, MAX_FRAME_SIZE } from '../config/defaults.js';

/**
 * Encode a JSON string into a length-prefixed frame buffer.
 */
export function encodeFrame(jsonString: string): Buffer {
  const payload = Buffer.from(jsonString, 'utf-8');
  const frame = Buffer.allocUnsafe(FRAME_HEADER_SIZE + payload.length);
  frame.writeUInt32BE(payload.length, 0);
  payload.copy(frame, FRAME_HEADER_SIZE);
  return frame;
}

/**
 * Streaming frame decoder.
 * Accumulates incoming TCP chunks and emits complete frames.
 *
 * Usage:
 *   const decoder = new FrameDecoder();
 *   socket.on('data', (chunk) => {
 *     const frames = decoder.push(chunk);
 *     for (const frame of frames) { ... }
 *   });
 */
export class FrameDecoder {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly maxFrameSize: number;

  constructor(maxFrameSize: number = MAX_FRAME_SIZE) {
    this.maxFrameSize = maxFrameSize;
  }

  /**
   * Push a new chunk of data and return any complete frames.
   * Each frame is returned as a UTF-8 string (the JSON content).
   *
   * @throws Error if a frame exceeds the maximum allowed size
   */
  push(chunk: Buffer): string[] {
    // Append the new chunk to the internal buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const frames: string[] = [];

    while (this.buffer.length >= FRAME_HEADER_SIZE) {
      // Read the payload length from the header
      const payloadLength = this.buffer.readUInt32BE(0);

      // Validate frame size
      if (payloadLength > this.maxFrameSize) {
        // Reset buffer to prevent stuck state
        this.buffer = Buffer.alloc(0);
        throw new Error(
          `Frame size ${payloadLength} exceeds maximum ${this.maxFrameSize}`
        );
      }

      // Check if we have a complete frame
      const totalFrameSize = FRAME_HEADER_SIZE + payloadLength;
      if (this.buffer.length < totalFrameSize) {
        // Partial frame — wait for more data
        break;
      }

      // Extract the complete frame payload
      const payload = this.buffer.subarray(FRAME_HEADER_SIZE, totalFrameSize);
      frames.push(payload.toString('utf-8'));

      // Remove the consumed frame from the buffer
      this.buffer = this.buffer.subarray(totalFrameSize);
    }

    return frames;
  }

  /** Reset the decoder state */
  reset(): void {
    this.buffer = Buffer.alloc(0);
  }

  /** Get the number of buffered bytes (useful for diagnostics) */
  get bufferedBytes(): number {
    return this.buffer.length;
  }
}
