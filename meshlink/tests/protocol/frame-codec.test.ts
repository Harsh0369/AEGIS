/**
 * MeshLink — Frame Codec Tests
 *
 * Tests length-prefixed TCP framing: encoding, decoding,
 * split frames, merged frames, oversized frames, etc.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeFrame, FrameDecoder } from '../../src/protocol/FrameCodec.js';
import { FRAME_HEADER_SIZE } from '../../src/config/defaults.js';

describe('encodeFrame', () => {
  it('should encode a message with a 4-byte length prefix', () => {
    const json = '{"type":"DATA"}';
    const frame = encodeFrame(json);
    const payloadLength = frame.readUInt32BE(0);
    assert.equal(payloadLength, Buffer.byteLength(json, 'utf-8'));
    assert.equal(frame.subarray(FRAME_HEADER_SIZE).toString('utf-8'), json);
  });

  it('should handle empty payload', () => {
    const frame = encodeFrame('');
    assert.equal(frame.readUInt32BE(0), 0);
    assert.equal(frame.length, FRAME_HEADER_SIZE);
  });

  it('should handle unicode correctly', () => {
    const json = '{"payload":"こんにちは"}';
    const frame = encodeFrame(json);
    const payloadLength = frame.readUInt32BE(0);
    assert.equal(payloadLength, Buffer.byteLength(json, 'utf-8'));
  });
});

describe('FrameDecoder', () => {
  it('should decode a single complete frame', () => {
    const decoder = new FrameDecoder();
    const json = '{"msg":"hello"}';
    const frame = encodeFrame(json);
    const frames = decoder.push(frame);
    assert.equal(frames.length, 1);
    assert.equal(frames[0], json);
  });

  it('should decode multiple frames in one chunk', () => {
    const decoder = new FrameDecoder();
    const msg1 = '{"msg":"one"}';
    const msg2 = '{"msg":"two"}';
    const msg3 = '{"msg":"three"}';
    const combined = Buffer.concat([
      encodeFrame(msg1),
      encodeFrame(msg2),
      encodeFrame(msg3),
    ]);

    const frames = decoder.push(combined);
    assert.equal(frames.length, 3);
    assert.equal(frames[0], msg1);
    assert.equal(frames[1], msg2);
    assert.equal(frames[2], msg3);
  });

  it('should handle a frame split across two chunks', () => {
    const decoder = new FrameDecoder();
    const json = '{"data":"split test with some content"}';
    const frame = encodeFrame(json);

    // Split in the middle
    const splitPoint = Math.floor(frame.length / 2);
    const chunk1 = frame.subarray(0, splitPoint);
    const chunk2 = frame.subarray(splitPoint);

    const frames1 = decoder.push(chunk1);
    assert.equal(frames1.length, 0, 'Partial frame should yield nothing');

    const frames2 = decoder.push(chunk2);
    assert.equal(frames2.length, 1);
    assert.equal(frames2[0], json);
  });

  it('should handle header split across chunks', () => {
    const decoder = new FrameDecoder();
    const json = '{"x":"y"}';
    const frame = encodeFrame(json);

    // Split within the header (at byte 2)
    const chunk1 = frame.subarray(0, 2);
    const chunk2 = frame.subarray(2);

    const frames1 = decoder.push(chunk1);
    assert.equal(frames1.length, 0);

    const frames2 = decoder.push(chunk2);
    assert.equal(frames2.length, 1);
    assert.equal(frames2[0], json);
  });

  it('should handle one byte at a time', () => {
    const decoder = new FrameDecoder();
    const json = '{"slow":"byte by byte"}';
    const frame = encodeFrame(json);

    let finalFrames: string[] = [];
    for (let i = 0; i < frame.length; i++) {
      const chunk = frame.subarray(i, i + 1);
      const result = decoder.push(chunk);
      if (result.length > 0) {
        finalFrames = finalFrames.concat(result);
      }
    }

    assert.equal(finalFrames.length, 1);
    assert.equal(finalFrames[0], json);
  });

  it('should throw on oversized frame', () => {
    const decoder = new FrameDecoder(100); // Max 100 bytes
    const header = Buffer.alloc(4);
    header.writeUInt32BE(200, 0); // Claim 200 bytes

    assert.throws(() => decoder.push(header), /exceeds maximum/);
  });

  it('should reset buffer after oversized frame error', () => {
    const decoder = new FrameDecoder(50);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(100, 0);

    try { decoder.push(header); } catch { /* expected */ }

    // After reset, normal frames should work
    const json = '{"ok":"yes"}';
    const frame = encodeFrame(json);
    const frames = decoder.push(frame);
    assert.equal(frames.length, 1);
    assert.equal(frames[0], json);
  });

  it('should report buffered bytes correctly', () => {
    const decoder = new FrameDecoder();
    assert.equal(decoder.bufferedBytes, 0);

    const json = '{"test":"buffer"}';
    const frame = encodeFrame(json);
    const partial = frame.subarray(0, 3);
    decoder.push(partial);
    assert.equal(decoder.bufferedBytes, 3);

    decoder.reset();
    assert.equal(decoder.bufferedBytes, 0);
  });

  it('should handle empty chunk', () => {
    const decoder = new FrameDecoder();
    const frames = decoder.push(Buffer.alloc(0));
    assert.equal(frames.length, 0);
  });
});
