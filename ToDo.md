# To Do

## Unfinished

- make /play command more performant - Lavalink way (currently on lavalinkMigrate branch)
  - Test lavalinkMigrate branch on Google Cloud Compute Engine (VM)
  - Once successful, commit to Main branch
  - tag that merge as 'v2.0-lavalink'
- implement Pm2/Pino npm package for internal managing and logging system

## Finished
- Make Bot access a Public Google Drive Folder - DONE
- Create basic Discord Bot functinality - DONE
- Make /list result ephemeral for users looking for songs - DONE
- limit /list result to 10, implelment pagination by adding a optinal page argument - DONE
- - configure /list to show all even if there are folder with songs inside (use recursive) - DONE
- '/play <song-id>' commands to make bot play a song (one Song for now) - DONE
- add /stop command to stop music - DONE
- shorten songiD (very long to 6 alphanumerical characters) for ease of command usage - DONE
- create service to check if command was done my moderator/admin, implement to all commands - DONE
- create a queue system - DONE
- modify '/play <song-id>' to add the song on queue. If none is on queue, play the song. - DONE
- modify /stop to /skip to stop song and get to the next song in the queue - DONE
- '/queue' command to list queue (ephemeral) + pagination - DONE
- bring back /stop but use it to stop the DJ from playing current song and clearing up the queue - DONE
- find way to sort playlist (alphabetically on filename, chronologically last-added, reverse alphabetically, chronollogicaly first-added) - DONE


__Additional Notes on this [link](https://gemini.google.com/share/de73c37028cd)__
