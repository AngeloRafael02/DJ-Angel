# To Do

## Unfinished
- /search and /playlist take too long to register, fix bottleneck
- /mode config to switch between play-all-then-loop, play-current-song-in loop, current queue system - In Speculation
- add tag for latest build before merging 'dockerMigrate' branch
- Migrate from using MP2 + VM to Docker
  - Migrate from 'better-sqlite3' to 'MongoDB Atlas' as setup in Docker - DONE
  - Migrate from local Lavalink to Cloud Provider ([Kerit Cloud](https://kerit.cloud/lavalink), [Heaven Cloud](https://heavencloud.in/lavalink),[Square Cloud](https://docs.squarecloud.app/en/tutorials/how-to-create-your-lavalink-server), etc. )
  - Dockerize Source code (also create Dockerfile and docker-compose.yml)

## Finished
- Make Bot access a Public Google Drive Folder - DONE
- Create basic Discord Bot functinality - DONE
- Make /list result ephemeral for users looking for songs - DONE
- limit /list result to 10, implelment pagination by adding a optinal page argument - DONE
- configure /list to show all even if there are folder with songs inside (use recursive) - DONE
- '/play <song-id>' commands to make bot play a song (one Song for now) - DONE
- add /stop command to stop music - DONE
- shorten songiD (very long to 6 alphanumerical characters) for ease of command usage - DONE
- create service to check if command was done my moderator/admin, implement to all commands - DONE
- create a queue system - DONE
- modify '/play <song-id>' to add the song on queue. If none is on queue, play the song. - DONE
- modify /stop to /skip to stop song and get to the next song in the queue - DONE
- '/queue' command to list queue (ephemeral) + pagination - DONE
- bring back /stop but use it to stop the DJ from playing current song and clearing up the queue - DONE
- make /play command more performant - Lavalink (V2.0-lavalink version)
- implement PM2 npm package for interanal logging system - DONE
- find way to sort playlist (alphabetically on filename, alphabetically on author, alphabetically on album, chronologically last-added) - DONE
- add --get and --set argumentt to get or set Gooogle Drive folder URL - DONE
- try adding buttons per song in `/list` to auto-play song / send song to queue - DONE
- Bug: /skip does not work (skip must stop the song if queue has one last song) - DONE
- add number to /skip to skip a number of songs in queue - DONE
- `src/database/id-registry.ts` and  `src/database/search-cache.ts` may be merged/implemented cleaner since ids on both tables are duplicate - DONE
- Bot autojoins on last /move voice Channel when it restarts - DONE
- Fized Auto Join timing: Only Join when all commands in /commands are registered - DONE
- Maybe remove 'src\utils\crypto.ts' to directly use 'src\database\id-registry.ts' instead - DONE
- create playlist groups feature by putting songs on sub folders inside public folder - DONE
    - Have a specific command to list all folders (playlist) inside Root Folder (all songs group on the folder no matter how deep it is from the root folder, is counted as a playlist)
        - modify '/play id' so that if the arguments is a folder , add all mp3 files of that folder to queue - DONE
    - refactor Sqlite DB Structure to also store Folders/playlist - DONE
        - create new Table 'drive_folders' table with 'id' PRIMARY KEY, 'name' TEXT, and 'short_id' TEXT - DONE
        - add 'folder_id' column to drive_cache, reference key new drive_folders Table column 'id' - DONE
    - '/play folder-id' may take longer expecially if there are more songs in the folder. refactor to immediately play the first song found and add the rest into queue on background. - Implemented Lazy loading of songs to Queue. DONE
- Add Buttons for '/list folders' for more convenient experience - DONE
- Add Some Documentation - DONE
- Add '/list songs' argument called 'folder-id' to return only songs from that sub-folder - DONE
- Research about implementing using a PRIVATE Google Dive Folder as a playlist - DONE, entirely possible this whole time
- Add Text on '/list' before buttons, telling that each button corresponds to a song in the prompt, click the button to play it. - DONE
- Indicate in '/list folders' the path of each folder, or atleast show the parent of each folder, show 'root' on the base folder. - DONE

## CANCELLED
