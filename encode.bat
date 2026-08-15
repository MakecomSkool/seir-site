@echo off
if not exist public\video mkdir public\video
if not exist public\poster mkdir public\poster

for %%f in (raw\scrub_*.mp4) do (
  echo all-intra %%~nf
  ffmpeg -y -v error -i "%%f" -c:v libx264 -preset slow -crf 23 -g 1 -keyint_min 1 ^
    -sc_threshold 0 -pix_fmt yuv420p -an -movflags +faststart ^
    -vf "hqdn3d=2:1.5:3:2.5,scale=1600:-2" "public\video\%%~nf.mp4"
  ffmpeg -y -v error -i "%%f" -vframes 1 -q:v 3 -vf scale=1200:-2 "public\poster\%%~nf.webp"
)

for %%f in (raw\auto_*.mp4) do (
  echo standard %%~nf
  ffmpeg -y -v error -i "%%f" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p ^
    -an -movflags +faststart -vf "hqdn3d=2:1.5:3:2.5,scale=1600:-2" ^
    "public\video\%%~nf.mp4"
  ffmpeg -y -v error -i "%%f" -vframes 1 -q:v 3 -vf scale=1200:-2 "public\poster\%%~nf.webp"
)
echo Done.
