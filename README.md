# 🎵 DJ-Angel
A Discord DJ Bot that uses a public Google Drive folder as its music library

## 🚀 Overview
DJ-Angel allows you to host your own music collection on Google Drive and stream it directly to Discord. It leverages Lavalink for high-performance audio delivery and provides a seamless proxy between Google Drive APIs and Discord voice channels. An [image](https://hub.docker.com/repository/docker/angelorafael02/dj-angel/general) of the app is also available in Dockerhub

Evolution
- Current Version: Optimised for Lavalink (v2.0+).
- Legacy Version: [v1.0-ffmpeg](https://github.com/AngeloRafael02/DJ-Angel/releases/tag/v1.0-ffmpeg) (Direct FFMPEG implementation with limited commands).
---



### 🛠 Prerequisites
- <b>Hardware Requirements</b>
    - <b>Minimum:</b> Equivalent to a Google Cloud Engine's e2-medium (2 vCPU, 4GB RAM)
    - <b>Network:</b> Stable outbound connection to Google APIs and Discord Gateways.
---
### 📦 Deployment Instructions
1. Environment Setup: Create a .env file in the root directory. Refer to [.env.example](.env.example) for required keys (Token, App ID, Lavalink credentials, etc.).
2. Google Credentials: Place your Google API credentials.json in the root folder and rename it to dj-angel-bot.json.
3. Lavalink Configuration:
    - VM Deployment: Ensure the Lavalink jar is running on your host machine. It must also have [Lavalink](https://github.com/lavalink-devs/Lavalink) and [Java](https://www.java.com/en/download/) with the credentials put in the .env file.
    - Docker Deployment: Lavalink can be hosted externally; simply point your [.env](.env.example) config to your Lavalink instance.
---
### 🔒 Private Folder Setup
 DJ-Angel Bot can also use a private Google Drive folder, but with additional steps:
 - In the Google Drive APIs credentials.json (renamed as dj-angel-bot.json), copy the value of the `client_email`.
 - Go to your Private Google Drive Folder and share that folder to the `client_email`, preferably, setting the Role as a 'Viewer'.
 - Start The DJ-Angel Bot.
 - Use the `/playlist set` command and set the `url` argument with your private Google Drive Folder.
 - The Bot will automatically have access to the folder and still scan for songs in your folder.
---
### 🗺 Source Code Map
```bash
src/                # Root Folder
├── commands/       # Discord slash command definitions
│   ├── config/     # Bot & Server settings
│   └── music/      # Playback and queue controls
├── core/           # Core event loops and bot logic
├── database/       # Handles local MongoDB database logic (SQL)
├── routes/         # Proxy Stream Path to Connect Lavalink and Google Drive API
├── services/       # External API integrations
└── utils/          # Stores all Helper functions and constants
```

### 📈 System Flow
You can view the architectural logic and data flow in our [LucidChart Diagram](https://lucid.app/lucidchart/f29097d4-c392-41ac-a090-356e71395e6d/edit?viewport_loc=-839%2C360%2C2175%2C1041%2C0_0&invitationId=inv_2b26c7e2-4c6d-42f9-8771-7ab5f85408cd).
