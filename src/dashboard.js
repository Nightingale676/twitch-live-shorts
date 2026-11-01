import express from 'express';
import { readdir, stat, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TwitchClipsClient } from './twitchClips.js';
export function createDashboard({ getStatus, createClip, changeRecording, outputDirectory = process.env.OUTPUT_DIR || 'output', twitchClient = new TwitchClipsClient() }) {
  const app = express();
  const output = resolve(outputDirectory);
  app.use((req, res, next) => {
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return res.sendStatus(403);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.get('/api/status', async (req, res) => res.json(await getStatus()));
  app.post('/api/recording', express.json({ limit: '1kb' }), async (req, res) => {
    const channel = req.body?.channel;
    if (channel !== null && (typeof channel !== 'string' || !/^[a-zA-Z0-9_]{1,25}$/.test(channel))) return res.status(400).json({ error: 'Enter a Twitch username, without a URL or #.' });
    try {
      await changeRecording(channel);
      res.json({ accepted: true });
    } catch (error) { res.status(409).json({ error: error?.message || String(error || 'Recording could not start.') }); }
  });
  app.post('/api/clips', (req, res) => {
    try { createClip(); res.status(202).json({ accepted: true }); }
    catch (error) { res.status(409).json({ error: error.message }); }
  });
  app.get('/api/clips', async (req, res) => {
    const names = await readdir(output).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
    const clips = await Promise.all(names.filter(name => /^short-[a-f0-9-]+\.mp4$/.test(name)).map(async name => {
      const info = await stat(join(output, name));
      let title = null;
      try {
        const metadata = JSON.parse(await readFile(join(output, `${name}.json`), 'utf8'));
        if (typeof metadata.title === 'string') title = metadata.title.slice(0, 160);
      } catch (error) {
        if (error.code !== 'ENOENT') console.warn(`Could not read title for ${name}: ${error.message}`);
      }
      return { name, title, bytes: info.size, createdAt: info.mtime.toISOString(), url: `/clips/${encodeURIComponent(name)}` };
    }));
    res.json(clips.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
  app.get('/api/twitch-clips', async (req, res, next) => {
    if (!twitchClient.configured) return res.json({ configured: false, clips: [], cursor: null });
    const after = typeof req.query.after === 'string' ? req.query.after : '';
    if (after.length > 500) return res.status(400).json({ error: 'Invalid pagination cursor.' });
    try { res.json({ configured: true, ...await twitchClient.discover(after) }); }
    catch (error) { res.status(502).json({ error: error.message }); }
  });
  app.use('/clips', express.static(output, { dotfiles: 'deny', index: false }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use((error, req, res, next) => res.status(500).json({ error: 'Unable to read dashboard data.' }));
  return app;
}


