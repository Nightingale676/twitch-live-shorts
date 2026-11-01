import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const DEFAULT_FILTER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1';

export async function renderVerticalClip(inputPath, outputPath, filterString) {
  if (!ffmpegPath) throw new Error('FFmpeg is unavailable on this platform.');
  if (resolve(inputPath) === resolve(outputPath)) {
    throw new Error('Input and output video paths must be different.');
  }
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  const vf = filterString?.trim() || DEFAULT_FILTER;
  if (/\[(?:0:v(?::0)?|outv)\]/.test(vf)) {
    throw new Error('Use a simple video filter without [0:v] or [outv] labels.');
  }
  return new Promise((resolve, reject) => {
    const args = [
      '-y', '-i', inputPath, '-map', '0:v:0', '-map', '0:a?',
      '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-movflags', '+faststart', outputPath
    ];
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', data => {
      stderr = (stderr + data.toString()).slice(-8000);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFmpeg exited with code ${code}:\n${stderr}`));
    });
  });
}

