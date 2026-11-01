const $ = id => document.getElementById(id);
let clipSignature = '';
let pending = false;
let twitchClips = [];
let twitchCursor = null;
let twitchConfigured = false;
let twitchCheckedAt = 0;
let twitchError = null;
let twitchLoading = false;
let recordingPending = false;
async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(response.status === 404
      ? 'The running server is outdated. Stop it with Ctrl+C, restart npm.cmd start in twitch-codex-shorts, then refresh this page.'
      : `The server returned an unexpected response (${response.status}). Restart the app and refresh this page.`);
  }
  if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Request failed'); }
  return response.json();
}
function showError(message) { $('error').textContent = message || ''; $('error').hidden = !message; }
async function refresh() {
  try {
    const status = await api('/api/status');
    const discovery = status.mode === 'discovery';
    $('startRecording').disabled = recordingPending || status.switching || status.processing;
    $('stopRecording').disabled = recordingPending || status.switching || status.processing || discovery;
    $('connection').textContent = discovery ? 'Discovery connected' : 'Recorder connected';
    $('channel').textContent = discovery ? 'Across Twitch creators' : `#${status.channel}`;
    $('channelLink').href = discovery ? 'https://www.twitch.tv/directory' : `https://www.twitch.tv/${encodeURIComponent(status.channel)}`;
    $('capture').textContent = status.capture;
    $('chat').textContent = status.chat;
    $('buffer').textContent = `${status.bufferedSeconds}s`;
    $('captureText').textContent = status.capture !== 'running' ? 'Capture unavailable — check activity below' : status.bufferedSeconds < 30 ? 'Waiting for enough live footage...' : 'Live footage buffered and ready';
    if (discovery) $('captureText').textContent = 'Open Your clips to explore public clips across creators';
    $('create').disabled = pending || status.processing || status.capture !== 'running' || status.bufferedSeconds < 10;
    $('create').textContent = status.processing ? 'Processing your clip...' : 'Create clip ↗';
    showError(status.error);
    $('events').replaceChildren(...status.events.map(event => {
      const row = document.createElement('div'); row.className = `event ${event.type}`;
      const time = document.createElement('time'); time.textContent = new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      row.append(time, document.createTextNode(event.message)); return row;
    }));
    if (Date.now() - twitchCheckedAt > 120000 && !twitchLoading) {
      twitchCheckedAt = Date.now();
      twitchLoading = true;
      try {
        const response = await api('/api/twitch-clips');
        twitchConfigured = response.configured;
        twitchClips = response.clips || [];
        twitchCursor = response.cursor;
        twitchError = null;
      } catch (error) { twitchError = error.message; }
      finally { twitchLoading = false; }
    }
    updateTwitchControls();
    if (!status.processing) {
      const clips = await api('/api/clips');
      $('count').textContent = clips.length;
      const combined = [...clips.map(clip => ({ ...clip, source: 'local' })), ...twitchClips];
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const signature = JSON.stringify(combined);
      if (signature !== clipSignature) window.renderReels(combined);
      clipSignature = signature;
    }
  } catch (error) {
    $('connection').textContent = 'Recorder disconnected';
    $('create').disabled = true;
    showError(`Cannot reach the recorder. Make sure npm start is running. ${error.message}`);
  }
}
$('create').addEventListener('click', async () => {
  pending = true; $('create').disabled = true;
  try { await api('/api/clips', { method: 'POST' }); }
  catch (error) { showError(error.message); }
  finally { pending = false; await refresh(); }
});
async function poll() { await refresh(); setTimeout(poll, 2500); }
void poll();

async function setRecording(channel) {
  recordingPending = true;
  $('startRecording').disabled = true;
  $('stopRecording').disabled = true;
  $('recordingMessage').textContent = channel ? `Starting recording for ${channel}…` : 'Stopping recording…';
  try {
    await api('/api/recording', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }) });
    $('recordingMessage').textContent = channel ? `Recording ${channel}. Allow about 30 seconds for the buffer. Offline channels wait until they go live.` : 'Recording stopped. You can still browse clips across creators.';
  } catch (error) { $('recordingMessage').textContent = error.message; }
  finally { recordingPending = false; await refresh(); }
}
$('recordingForm').addEventListener('submit', event => {
  event.preventDefault();
  void setRecording($('creatorInput').value.trim());
});
$('stopRecording').addEventListener('click', () => { void setRecording(null); });



function updateTwitchControls() {
  const notice = $('twitchNotice');
  const more = $('twitchMore');
  if (twitchError) notice.textContent = `Twitch clips: ${twitchError}`;
  else if (!twitchConfigured) notice.textContent = 'Add a Twitch Client ID and secret in .env to show public channel clips.';
  else notice.textContent = twitchClips.length ? `${twitchClips.length} Twitch clips across creators · past 7 days` : 'No public Twitch clips found in these categories.';
  more.hidden = !twitchConfigured || !twitchCursor;
  more.disabled = twitchLoading;
}
$('twitchMore').addEventListener('click', async () => {
  if (!twitchCursor || twitchLoading) return;
  twitchLoading = true; updateTwitchControls();
  try {
    const page = await api(`/api/twitch-clips?after=${encodeURIComponent(twitchCursor)}`);
    const seen = new Set(twitchClips.map(clip => clip.name));
    twitchClips.push(...page.clips.filter(clip => !seen.has(clip.name)));
    twitchCursor = page.cursor;
    twitchError = null;
    clipSignature = '';
    await refresh();
  } catch (error) { twitchError = error.message; }
  finally { twitchLoading = false; updateTwitchControls(); }
});
