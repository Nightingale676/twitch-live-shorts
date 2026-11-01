import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { parseHighlightResponse } from '../src/codexProcessor.js';
import { DEFAULT_FILTER, renderVerticalClip } from '../src/ffmpegRenderer.js';

const response = (content, finish_reason = 'stop') => ({
  choices: [{ finish_reason, message: { content } }]
});

test('valid response uses default filter when omitted', () => {
  assert.deepEqual(parseHighlightResponse(response('{"title":"Great play"}')),
    { title: 'Great play', filterString: DEFAULT_FILTER });
});

test('incomplete, empty, malformed, and invalid responses are rejected', () => {
  for (const value of [
    {}, response(null), response('{'), response('null'),
    response('{"title":""}'), response('{"title":"Play","filterString":42}'),
    response('{"title":"Play"}', 'length')
  ]) assert.throws(() => parseHighlightResponse(value));
});

test('renders an actual 1080x1920 MP4 and reports render failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'twitch-shorts-test-'));
  try {
    const input = join(dir, 'input.mp4');
    const output = join(dir, 'nested', 'output.mp4');
    execFileSync(ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=5',
      '-t', '0.4', '-c:v', 'libx264', input
    ], { stdio: 'pipe', windowsHide: true });
    assert.equal(await renderVerticalClip(input, output), output);
    assert.ok((await stat(output)).size > 0);
    const metadata = execFileSync(ffmpegPath, [
      '-i', output, '-frames:v', '1', '-f', 'null', '-'
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    assert.equal(typeof metadata, 'string');
    // Decode one frame to raw RGB: its size verifies the output dimensions.
    const frame = execFileSync(ffmpegPath, [
      '-v', 'error', '-i', output, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'
    ], { maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    assert.equal(frame.length, 1080 * 1920 * 3);
    await assert.rejects(renderVerticalClip(input, input), /must be different/);
    await assert.rejects(renderVerticalClip(input, output, 'invalid_filter'), /FFmpeg exited/);
    await assert.rejects(renderVerticalClip(input, output, '[0:v]scale=1080:1920[outv]'), /simple video filter/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
