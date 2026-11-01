export class TwitchClipsClient {
  constructor({ clientId = process.env.TWITCH_CLIENT_ID, clientSecret = process.env.TWITCH_CLIENT_SECRET, fetchImpl = fetch } = {}) {
    this.clientId = clientId?.trim();
    this.clientSecret = clientSecret?.trim();
    this.fetch = fetchImpl;
    this.token = null;
    this.tokenExpires = 0;
    this.channelIds = new Map();
  }
  get configured() { return Boolean(this.clientId && this.clientSecret); }
  async accessToken() {
    if (!this.configured) throw new Error('Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env to load Twitch clips.');
    if (this.token && Date.now() < this.tokenExpires - 60000) return this.token;
    const body = new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'client_credentials' });
    const response = await this.fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Twitch authentication failed (${response.status}). Check your Twitch API credentials.`);
    const result = await response.json();
    if (typeof result.access_token !== 'string') throw new Error('Twitch did not return an access token.');
    this.token = result.access_token;
    this.tokenExpires = Date.now() + Number(result.expires_in || 0) * 1000;
    return this.token;
  }
  async helix(path, params) {
    const token = await this.accessToken();
    const url = new URL(`https://api.twitch.tv/helix/${path}`);
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
    const response = await this.fetch(url, { headers: { 'Client-Id': this.clientId, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      if (response.status === 401) { this.token = null; this.tokenExpires = 0; }
      throw new Error(`Twitch clips request failed (${response.status}).`);
    }
    return response.json();
  }
  async discover(after = '') {
    const categories = await this.helix('games/top', { first: '5', after });
    const endedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - 7 * 86400000).toISOString();
    const pages = await Promise.all((categories.data || []).map(game =>
      this.helix('clips', { game_id: game.id, first: '20', started_at: startedAt, ended_at: endedAt })
    ));
    const clips = pages.flatMap(page => this.normalize(page.data || []));
    return {
      clips: [...new Map(clips.map(clip => [clip.name, clip])).values()].sort((a, b) => b.views - a.views),
      cursor: categories.pagination?.cursor || null
    };
  }
  normalize(clips) {
    return clips.filter(clip => typeof clip.id === 'string' && typeof clip.url === 'string').map(clip => ({
      name: `twitch:${clip.id}`, source: 'twitch', title: String(clip.title || ''),
      broadcaster: String(clip.broadcaster_name || ''),
      createdAt: clip.created_at, url: clip.url, thumbnail: clip.thumbnail_url,
      gameId: clip.game_id || null, views: Number(clip.view_count || 0), duration: Number(clip.duration || 0)
    }));
  }
  async clips(channel, after = '') {
    if (!/^[a-zA-Z0-9_]+$/.test(channel)) throw new Error('Invalid Twitch channel.');
    let broadcasterId = this.channelIds.get(channel.toLowerCase());
    if (!broadcasterId) {
      const users = await this.helix('users', { login: channel });
      broadcasterId = users.data?.[0]?.id;
      if (!broadcasterId) throw new Error(`Twitch channel ${channel} was not found.`);
      this.channelIds.set(channel.toLowerCase(), broadcasterId);
    }
    const result = await this.helix('clips', { broadcaster_id: broadcasterId, first: '100', after });
    return {
      clips: this.normalize(result.data || []),
      cursor: result.pagination?.cursor || null
    };
  }
}
