import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, copyFile, writeFile, unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ffmpegPath from 'ffmpeg-static';

const exec = promisify(execFile);
export const segmentArgs = directory => [
  '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
  '-map', '0:v:0', '-map', '0:a?', '-c', 'copy',
  '-f', 'segment', '-segment_time', '5', '-reset_timestamps', '1',
  join(directory, 'part-%09d.ts')
];

export class LiveCapture {
  constructor(channel) {
    if (!/^[a-zA-Z0-9_]+$/.test(channel)) throw new Error('TWITCH_CHANNEL must be a channel name, not a URL.');
    this.channel = channel;
    this.stopped = false;
    this.snapshotting = false;
  }

  async start() {
    this.command = process.env.STREAMLINK_PATH || 'py';
    this.prefix = process.env.STREAMLINK_PATH ? [] : ['-m', 'streamlink'];
    try {
      await exec(this.command, [...this.prefix, '--version'], { windowsHide: true, timeout: 10000 });
    } catch {
      throw new Error('Streamlink is required. Run: py -m pip install streamlink (or set STREAMLINK_PATH to streamlink.exe).');
    }
    this.directory = await mkdtemp(join(tmpdir(), 'twitch-live-'));
    this.launch();
    this.timer = setInterval(() => this.prune().catch(error => console.error('Buffer cleanup:', error.message)), 5000);
  }

  launch() {
    if (this.stopped) return;
    this.source = spawn(this.command, [...this.prefix, '--stdout', '--retry-streams', '15',
      `https://www.twitch.tv/${this.channel}`, '720p,720p60,best'], { windowsHide: true });
    this.encoder = spawn(ffmpegPath, segmentArgs(this.directory), { windowsHide: true });
    const source = this.source;
    const encoder = this.encoder;
    source.stdout.pipe(encoder.stdin);
    encoder.stdin.on('error', () => {});
    source.stderr.on('data', data => {
      const message = data.toString().trim();
      console.log(`[Capture] ${message}`);
      if (message.includes('WinError 10013')) {
        this.connectionError = 'Connection to Twitch is blocked (WinError 10013). Stop the background server and run npm.cmd start in your own terminal.';
      } else if (message.includes('[error]')) {
        this.connectionError = message.slice(-500);
      } else if (message.includes('Opening stream:')) {
        this.connectionError = null;
      }
    });
    encoder.stderr.on('data', data => console.error(`[Buffer] ${data.toString().trim()}`));
    source.on('error', error => { console.error('Capture error:', error.message); encoder.kill(); });
    encoder.on('error', error => { console.error('Buffer error:', error.message); source.kill(); });
    encoder.once('close', () => {
      source.kill();
      if (!this.stopped) {
        console.log('Capture ended. Restart the app when the stream is available.');
        this.failed = true;
      }
    });
  }

  async parts() {
    return (await readdir(this.directory)).filter(name => /^part-\d+\.ts$/.test(name)).sort();
  }

  async prune() {
    if (this.snapshotting || this.stopped) return;
    const parts = await this.parts();
    // Keep about 90 seconds. The newest file may still be open.
    for (const name of parts.slice(0, -18)) {
      if (this.snapshotting || this.stopped) break;
      await unlink(join(this.directory, name)).catch(() => {});
    }
  }

  async snapshot() {
    if (this.failed || this.stopped) throw new Error('Live capture is not running. Restart the app.');
    this.snapshotting = true;
    let directory;
    try {
      const parts = (await this.parts()).slice(0, -1).slice(-6);
      if (parts.length < 2) throw new Error('Live buffer is warming up. Wait about 15 seconds and try again.');
      directory = await mkdtemp(join(tmpdir(), 'twitch-highlight-'));
      for (const name of parts) await copyFile(join(this.directory, name), join(directory, name));
      await writeFile(join(directory, 'clips.txt'), parts.map(name => `file '${name}'`).join('\n'));
      const path = join(directory, 'highlight.ts');
      await exec(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', join(directory, 'clips.txt'),
        '-c', 'copy', path], { windowsHide: true, timeout: 60000 });
      return { path, cleanup: () => rm(directory, { recursive: true, force: true }) };
    } catch (error) {
      if (directory) await rm(directory, { recursive: true, force: true });
      throw error;
    } finally {
      this.snapshotting = false;
    }
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.timer);
    const children = [this.source, this.encoder].filter(Boolean);
    await Promise.all(children.map(child => new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('close', resolve);
      child.kill();
    })));
    if (this.directory) await rm(this.directory, { recursive: true, force: true });
  }
}
