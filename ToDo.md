# To Do

## Unfinished

- create service to check if command was done my moderator/admin, implement to all commands 
- make /play command more performant
  - consider StreamType.OggOpus insteadn of StreamType.Opus
  - consider '-re' flag in FFmpeg arguments to read input at the native frame rate
  - implement pre-buffering (wait until a small "chunk" (e.g., 200KB–500KB) is in the buffer)
  - Use a PassThrough stream from the node:stream module as an intermediary
  - move the Audio Player and FFmpeg transcoding into a Worker Thread
  - Cache Metadata: Store the name and mimeType in a local database (like Redis or SQLite). This allows your /play command to start the stream immediately without waiting for the first "metadata" API call to return.
  - Direct Link Access: If possible, use a service account with "viewer" permissions and generate a direct web-content link. This sometimes bypasses some of the overhead found in the official Node.js Drive SDK.
- create a queue system
- create '/add <song-id>' to add the song on queue if none is on queue, play the song.
- modify /stop to stop song and get to the next song in the queue
- '/queue' command to list queue (ephemeral) + pagination
- '/next' command to get to the next song in the queue
- add 'all' optonal flag to '/play' command to automatically put all songs in a queue (add songs that are not in queue yet)
- '/shuffle <boolean>' to config to shuffle the the queue
- implement Pino npm package for interanal logging system

## Finished
- Make Bot access a Public Google Drive Folder - DONE
- Create basic Discord Bot functinality - DONE
- Make /list result ephemeral for users looking for songs - DONE
- limit /list result to 10, implelment pagination by adding a optinal page argument - DONE
- - configure /list to show all even if there are folder with songs inside (use recursive) - DONE
- '/play <song-id>' commands to make bot play a song (one Song for now) - DONE
- add /stop command to stop music - DONE
- shorten songiD (very long to 6 alphanumerical characters) for ease of command usage - DONE


__Additional Notes on this [link](https://gemini.google.com/share/de73c37028cd)__
