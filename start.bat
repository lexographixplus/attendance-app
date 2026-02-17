@echo off
echo Starting TrainTrack Development Environment...

start "PHP Backend Server" cmd /k php -S 127.0.0.1:8001 -t .

echo Starting Frontend...
npm run dev
