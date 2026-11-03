@echo off
rem Start the Meiji and Rat desktop pet.
rem PowerShell handles the project path (which contains a space) reliably.
rem The Electron runtime lives outside the project on this machine.

set ELECTRON_RUN_AS_NODE=
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1"
