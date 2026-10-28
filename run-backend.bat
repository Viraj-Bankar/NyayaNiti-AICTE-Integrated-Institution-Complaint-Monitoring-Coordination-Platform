@echo off
echo ========================================================
echo Starting NyayaNiti FastAPI Backend (Port 8000)...
echo ========================================================
powershell -NoProfile -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch {}; exit 0"
cd backend
.\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
