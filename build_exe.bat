@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title TreeForge - Build Executable

echo ======================================================================
echo              TreeForge - Windows EXE Builder (PyInstaller)
echo ======================================================================
echo.

:: Check python
where python >nul 2>nul
if errorlevel 1 goto :no_python

:: Activate venv if it exists
if exist "%~dp0venv\Scripts\activate.bat" (
    call "%~dp0venv\Scripts\activate.bat"
)

:: Install PyInstaller and PyQt6
echo [*] Checking and installing PyInstaller ^& PyQt6...
python -m pip install --upgrade pip --quiet
pip install pyinstaller PyQt6

if exist "%~dp0requirements.txt" (
    pip install -r "%~dp0requirements.txt"
) else if exist "%~dp0TreeForge\requirements.txt" (
    pip install -r "%~dp0TreeForge\requirements.txt"
)

:: Icon setup
set "ICON_ARG="
if exist "%~dp0TreeForge\assets\app.ico" (
    set "ICON_ARG=--icon=%~dp0TreeForge\assets\app.ico"
) else if exist "%~dp0assets\app.ico" (
    set "ICON_ARG=--icon=%~dp0assets\app.ico"
)

:: Clean previous build
if exist "%~dp0build" rmdir /s /q "%~dp0build"
if exist "%~dp0dist\TreeForge.exe" del /f /q "%~dp0dist\TreeForge.exe"

set "TARGET_MAIN=%~dp0main.py"
if not exist "!TARGET_MAIN!" (
    if exist "%~dp0TreeForge\main.py" set "TARGET_MAIN=%~dp0TreeForge\main.py"
)

echo [*] Target main script: !TARGET_MAIN!
echo [*] Building standalone executable...
echo Please wait, this may take 1-2 minutes...
echo.

pyinstaller --noconsole ^
    --onefile ^
    --clean ^
    --name="TreeForge" ^
    !ICON_ARG! ^
    --add-data="TreeForge/assets;TreeForge/assets" ^
    --add-data="TreeForge/core;TreeForge/core" ^
    --add-data="TreeForge/services;TreeForge/services" ^
    --add-data="TreeForge/ui;TreeForge/ui" ^
    "!TARGET_MAIN!"

if errorlevel 1 goto :build_failed

echo.
echo ======================================================================
echo [SUCCESS] TreeForge.exe built successfully!
echo Output file: %~dp0dist\TreeForge.exe
echo ======================================================================
echo.

if exist "%~dp0dist\TreeForge.exe" (
    explorer "%~dp0dist"
)
pause
exit /b 0

:no_python
echo [ERROR] Python not found on system PATH.
echo Please install Python 3.11 or 3.12 from https://www.python.org/downloads/
pause
exit /b 1

:build_failed
echo.
echo [ERROR] PyInstaller failed to build TreeForge.exe!
pause
exit /b 1
