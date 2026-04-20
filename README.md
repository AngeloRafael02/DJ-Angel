# DJ-Angel
A Discord DJ Bot that uses a public Google Drive folder as its music library

> **NOTE**: DJ-Angel Bot also can use a private Google Drive folder but with additional steps:
> - In the Google Drive APIs credentials.json (renamed as dj-angel-bot.json) copy the value of the `client_email`.
> - Go to your Private Google Drive Folder and share that folder to the `client_email`, preferrably, setting the Role as a 'Viewer'.
> - Start The DJ-Angel Bot.
> - Use the `/playlist set` command and set the `url` argument with your private Google Drive Folder.
> - The Bot will automatically have access to the folder and sill scan for songs in your folder.

## Concept/Flowchart
- The Project should look work like this [chart](https://lucid.app/lucidchart/f29097d4-c392-41ac-a090-356e71395e6d/edit?viewport_loc=-898%2C79%2C2934%2C1405%2C0_0&invitationId=inv_2b26c7e2-4c6d-42f9-8771-7ab5f85408cd)
- There are two versions:
    - The Legacy Version ([v1.0-ffmpeg](https://github.com/AngeloRafael02/DJ-Angel/releases/tag/v1.0-ffmpeg)) that uses FFMPEG (with limited commands)
    - This Current version uses Lavalink


## Prerequisites
- Hardware Requirements
    - Minimum specs similar to Google Cloud Compute Engine's e2-medium (2 vCPU, 4GB RAM)
- Add the following files to the `root` level of the folder:
    - .env file (stores Discord Bot Credentials like App ID, Token, and Public Key )
    - dj-angel-bot.json (renamed credentials.json thatstores Google API Credentials)
- The Machine that hosts the source code must also have the following applications:
    - [Lavalink](https://github.com/lavalink-devs/Lavalink) which means that [Java](https://www.java.com/en/download/) must also required


## Source Code Map
```bash
src/                # Root Folder
├── commands/       # Stores all Discord command files
│   ├── config/
│   └── music/
├── core/           # Stores all important repeated processes
├── database/       # Handles local sqlite3 database logic (SQL)
├── routes/         # Proxy Stream Path to Connect Lavalink and Google Drive API
├── services/       # Handles all logic from outside the Bot
└── utils/          # Stores all miscellaneous functions
```
