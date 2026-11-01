import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import { LiveCapture, segmentArgs } from '../src/liveCapture.js';

test('live buffer segments, snapshots, decodes, and cleans up', async () => {
  const capture = new LiveCapture('example_channel');
  capture.directory = await mkdtemp(join(tmpdir(), 'twitch-buffer-test-'));
  let clip;
  try {
    await assert.rejects(capture.snapshot(), /warming up/);
    const stream = execFileSync(ffmpegPath, [
      '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=4',
      '-t', '20', '-c:v', 'libx264', '-g', '20', '-f', 'mpegts', 'pipe:1'
    ], { windowsHide: true });
    execFileSync(ffmpegPath, segmentArgs(capture.directory), { input: stream, windowsHide: true });
    assert.ok((await capture.parts()).length >= 4);
    clip = await capture.snapshot();
    assert.ok((await stat(clip.path)).size > 0);
    execFileSync(ffmpegPath, ['-v', 'error', '-i', clip.path, '-f', 'null', '-'], { windowsHide: true });
    // Old segments are pruned while the most recent files are retained.
    for (let i = 4; i < 24; i++) {
      await writeFile(join(capture.directory, `part-${String(i).padStart(9, '0')}.ts`), 'test');
    }
    await capture.prune();
    assert.equal((await capture.parts()).length, 18);
  } finally {
    if (clip) await clip.cleanup();
    await capture.stop();
  }
  await assert.rejects(stat(capture.directory), { code: 'ENOENT' });
});

test('channel URLs are rejected with a useful error', () => {
  assert.throws(() => new LiveCapture('https://twitch.tv/test'), /channel name/);
});
