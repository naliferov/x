## ffmpeg — cheat sheet

```sh
# Extract audio from video
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 output.wav
ffmpeg -i input.mp4 -acodec flac -bits_per_raw_sample 16 -ar 44100 output.flac
ffmpeg -i input.mp4 -vn -acodec mp3 -ab 320k -ar 44100 -ac 2 output.mp3

# Convert a list of wav → mp3
for FILE in *; do FNAME=$(echo $FILE | cut -d'.' -f 1); ffmpeg -i $FNAME.wav -vn -ar 44100 -ac 2 -b:a 320k $FNAME.mp3; done

# mkv → mp4 (without re-encoding)
ffmpeg -i "input.mkv" -codec copy "output.mp4"

# Cut a fragment (parameter order matters)
ffmpeg -ss 00:36:18 -i input.mp4 -vcodec copy -acodec copy -to 00:39:50 output.mp4
```
