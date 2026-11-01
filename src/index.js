import './config.js';
import tmi from 'tmi.js';
import { processHighlight } from './codexProcessor.js';
import { LiveCapture } from './liveCapture.js';
import { createDashboard } from './dashboard.js';
let channelName = (process.env.TWITCH_CHANNEL || 'twitch').replace(/^#/, '');
const liveRecording = process.env.LIVE_RECORDING === 'true';
let capture = new LiveCapture(channelName);
let client;
let switching = false;
const state = { mode: liveRecording ? 'recording' : 'discovery', channel: liveRecording ? channelName : null, capture: liveRecording ? 'starting' : 'disabled', chat: liveRecording ? 'connecting' : 'disabled', processing: false, error: null, events: [] };
let messageQueue = [];
function log(message, type = 'info') {
  state.events.unshift({ message, type, time: new Date().toISOString() });
  state.events = state.events.slice(0, 60);
  console.log(message);
}
async function runClip(event) {
  let clip;
  try {
    log('Preparing the latest footage...');
    clip = await capture.snapshot();
    log('Generating title and rendering vertical clip...');
    const result = await processHighlight(event, clip.path);
    log(`Clip ready: ${result.title}`, 'success');
  } catch (error) {
    state.error = error.message;
    log(`Pipeline error: ${error.message}`, 'error');
  } finally {
    if (clip) await clip.cleanup().catch(error => log(error.message, 'error'));
    state.processing = false;
  }
}
function createClip(event = { channel: channelName, trigger: 'Dashboard button', timestamp: new Date().toISOString() }) {
  if (switching) throw new Error('Wait for the recorder to finish switching.');
  if (state.processing) throw new Error('A clip is already being processed.');
  if (state.capture !== 'running' || capture.failed || capture.stopped) throw new Error('Capture is not running. Check the activity log.');
  state.processing = true;
  state.error = null;
  void runClip(event);
}
function attachChat() {
client.on('connected', () => { state.chat = 'connected'; log(`Connected to #${channelName} chat.`); });
client.on('disconnected', reason => { state.chat = 'disconnected'; log(`Chat disconnected: ${reason}`, 'error'); });
client.on('message', (channel, tags, message, self) => {
  if (self || state.processing) return;
  const now = Date.now();
  messageQueue = messageQueue.filter(t => t > now - 10000);
  messageQueue.push(now);
  if (/^!clip(?:\s|$)/i.test(message) || messageQueue.length > 10) {
    messageQueue = [];
    try { createClip({ channel, user: tags['display-name'] || tags.username || 'unknown', trigger: message, timestamp: new Date(now).toISOString() }); }
    catch (error) { log(error.message, 'error'); }
  }
});
}
async function stopCurrent() {
  if (client) {
    client.removeAllListeners();
    await client.disconnect().catch(() => {});
    client = null;
  }
  await capture.stop();
  messageQueue = [];
}
async function changeRecording(channel) {
  if (channel !== null && (typeof channel !== 'string' || !/^[a-zA-Z0-9_]{1,25}$/.test(channel))) {
    throw new Error('Enter a Twitch username (letters, numbers, underscores), without a URL.');
  }
  if (switching || state.processing) throw new Error('Wait for the current recording operation or clip to finish.');
  switching = true;
  state.capture = 'switching';
  try {
    await stopCurrent();
    state.error = null;
    state.channel = channel;
    state.mode = channel ? 'recording' : 'discovery';
    state.chat = 'disabled';
    state.capture = 'disabled';
    if (!channel) { log('Recording stopped. Discover clips across creators.'); return; }
    channelName = channel.toLowerCase();
    state.channel = channelName;
    state.capture = 'starting';
    capture = new LiveCapture(channelName);
    await capture.start();
    state.capture = 'running';
    log(`Buffering #${channelName}. Allow about 30 seconds before creating a clip.`);
    client = new tmi.Client({ options: { debug: true }, connection: { reconnect: false }, channels: [channelName] });
    state.chat = 'connecting';
    attachChat();
    try {
      await client.connect();
    } catch (error) {
      const message = error?.message || String(error || 'Unable to connect to Twitch chat');
      state.chat = 'unavailable';
      log(`Chat unavailable: ${message}. Use Create clip; recording continues.`, 'info');
    }
  } catch (error) {
    await stopCurrent();
    state.capture = 'stopped';
    state.chat = 'disconnected';
    const message = error?.message || String(error || 'Recording could not start');
    state.error = message;
    log(`Recording failed: ${message}`, 'error');
    throw new Error(message);
  } finally { switching = false; }
}
const app = createDashboard({ createClip, changeRecording, getStatus: async () => {
  const parts = capture.directory ? await capture.parts().catch(() => []) : [];
  return { ...state, error: state.error || capture.connectionError || null, switching, capture: capture.failed ? 'stopped' : capture.connectionError && !capture.stopped ? 'connection blocked' : state.capture, bufferedSeconds: capture.stopped ? 0 : Math.max(0, parts.length - 1) * 5 };
} });
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, '127.0.0.1');
server.once('listening', async () => {
  log(`Dashboard: http://127.0.0.1:${port}`);
  if (!liveRecording) {
    log('Discovery mode: public clips across creators. No channel chat or live recording.');
    return;
  }
  try {
    await changeRecording(channelName);
  } catch (error) {
    state.error = error.message;
    state.capture = 'stopped';
    log(`Startup failed: ${error.message}`, 'error');
    await capture.stop();
  }
});
server.on('error', error => { console.error(`Dashboard failed: ${error.message}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await stopCurrent();
  server.close();
  process.exit(0);
});

