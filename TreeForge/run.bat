@echo off
setlocal
cd /d "%~dp0"
title TreeForge - Launcher

:: Check for python
where python >nul 2>nul
if errorlevel 1 goto :no_python

:: Activate venv if it exists
if exist "%~dp0venv\Scripts\activate.bat" (
    call "%~dp0venv\Scripts\activate.bat"
)

:: Run smart launcher
if exist "%~dp0run.py" (
    python "%~dp0run.py" %*
    if errorlevel 1 goto :failed
    goto :end
)

if exist "%~dp0main.py" (
    python "%~dp0main.py" %*
    if errorlevel 1 goto :failed
    goto :end
)

if exist "%~dp0..\main.py" (
    python "%~dp0..\main.py" %*
    if errorlevel 1 goto :failed
    goto :end
)

goto :no_main

:no_python
echo ======================================================================
echo [ERROR] Python is not installed or not added to your system PATH!
echo [خطأ] لم يتم العثور على بايثون مثبت في مسار النظام!
echo.
echo Please install Python 3.11 or 3.12 from:
echo https://www.python.org/downloads/
echo ======================================================================
echo.
pause
exit /b 1

:no_main
echo [ERROR] Could not find main.py or run.py in %~dp0
pause
exit /b 1

:failed
echo.
echo [!] Application exited with an error code.
pause
exit /b 1

:end
exit /b 0
