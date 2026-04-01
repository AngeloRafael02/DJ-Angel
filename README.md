# DJ-Angel
A Discord DJ Bot that uses a public google drive folder as their music library

## Concept/Flowchart
The Project should look work like this [chart](https://lucid.app/lucidchart/f29097d4-c392-41ac-a090-356e71395e6d/edit?viewport_loc=-898%2C79%2C2934%2C1405%2C0_0&invitationId=inv_2b26c7e2-4c6d-42f9-8771-7ab5f85408cd)


## Prerequisites
- Hardware Requirements
    - Minimum specs similar to Google Cloud Compute Engine's e2-medium (2 vCPU, 4GB RAM)
- Add the following files on the `root` level of the folder:
    - .env file (stores Discord Bot Credentials like, App ID, Token, and Public Key )
    - dj-angel-bot.json (stores Google API Creadentials)
- The Machine that hosts the source code must also have the following applications:
    - [Lavalink](https://github.com/lavalink-devs/Lavalink) which means that [Java](https://www.java.com/en/download/) must also required
