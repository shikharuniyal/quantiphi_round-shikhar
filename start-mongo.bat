@echo off
rem Starts the local MongoDB server (keep this window open)
"%USERPROFILE%\mongodb\mongodb-win32-x86_64-windows-7.0.14in\mongod.exe" --dbpath "%USERPROFILE%\mongodb\data" --bind_ip 127.0.0.1 --port 27017
