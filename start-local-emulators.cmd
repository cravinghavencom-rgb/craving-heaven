@echo off
setlocal
cd /d "%~dp0"
set "XDG_CONFIG_HOME=%CD%\.firebase-runtime-config"
set "FUNCTIONS_DISCOVERY_TIMEOUT=60"
firebase.cmd emulators:start --only auth,firestore,functions,hosting --project demo-craving-heaven-local
