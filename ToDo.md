# To Do

## Unfinished
- create playlist groups by putting songs on sub folders inside public folder
- `src/database/id-registry.ts` and  `src/database/search-cache.ts` may be merged/implemented cleaner since ids on both tables are duplicate
- /mode config to switch between play-all-then-loop, play-current-song-in loop, current queue system


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
- make /play command more performant - Lavalink (V2.0-lavalink version)
- implement PM2 npm package for interanal logging system - DONE
- find way to sort playlist (alphabetically on filename, alphabetically on author, alphabetically on album, chronologically last-added) - DONE
- add --get and --set argumentt to get or set Gooogle Drive folder URL - DONE
- try adding buttons per song in `/list` to auto-play song / send song to queue - DONE
- Bug: /skip does not work (skip must stop the song if queue has one last song) - DONE
- add number to /skip to skip a number of songs in queue - DONE

## CANCELLED
- Research (and possibly migrate) using docker (include debian, java, lavalink, nodeJS, npm, firewall rules, etc. ) - CANCELLED, Forks of the Project can do this

__Additional Notes on this [link](https://gemini.google.com/share/de73c37028cd)__
