@echo off
cmd /k "cd /d %~dp0.venv\Scripts & activate & cd /d %~dp0 & python publish-amibroker-lists.py"
rem pause