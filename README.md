# 🎮 Stream Clips — Twitch Shorts Studio

A **hackathon project built for the Codex x TwitchCon Hackathon**. Turn live Twitch moments into vertical clips, switch between creators from the studio, and explore public clips from across Twitch. ✂️📺

## ✨ What it does

- 🔴 Record a live Twitch channel by username from the dashboard.
- 🔁 Switch creators at any time; finished clips stay saved.
- 🤖 Use OpenAI to create a title and filter, then render a vertical 1080 × 1920 MP4.
- 💬 Create a clip from the dashboard or trigger one with `!clip` in chat.
- 🌐 Browse public clips across popular Twitch categories.
- 💜 Like clips to shape the local **For you** feed.

## 🚀 Run it locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add your `OPENAI_API_KEY`.
3. Add a Twitch Client ID and Client Secret as `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to enable public clip discovery.
4. Install Streamlink. On Windows, use the [Streamlink installer](https://streamlink.github.io/install.html#windows), or run `py -m pip install streamlink`.
5. Start the app with `npm start` and open [http://127.0.0.1:3000](http://127.0.0.1:3000).
6. Enter a live creator’s username in the studio and click **Start recording**. Wait about 30 seconds for the buffer, then click **Create clip**.

Set `STREAMLINK_PATH` in `.env` if `streamlink.exe` is not on your PATH. The default mode is clip discovery; recording starts when you choose a creator in the dashboard. Only one creator is recorded at a time. Switching channels clears the live buffer, while saved clips remain available. Chat triggers require a Twitch chat connection; dashboard recording and manual clipping are also available.

## 🔐 Configuration

Keep API keys in `.env`; never commit that file. `.env.example` lists the available settings, including `PORT`, `OUTPUT_DIR`, `STREAMLINK_PATH`, and the optional `LIVE_RECORDING` startup setting.

## 🧪 Development

```powershell
npm test
npm run check
```

Clips are saved under `output/`. Twitch discovery fetches recent clips from popular categories and is not a complete archive of every Twitch clip.

