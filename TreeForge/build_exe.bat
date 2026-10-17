@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title TreeForge - Build Executable

echo ======================================================================
echo              TreeForge - Windows EXE Builder (PyInstaller)
echo ======================================================================
echo.

where python >nul 2>nul
if errorlevel 1 goto :no_python

if exist "%~dp0venv\Scripts\activate.bat" (
    call "%~dp0venv\Scripts\activate.bat"
)

python -m pip install --upgrade pip --quiet
pip install pyinstaller PyQt6

if exist "%~dp0requirements.txt" (
    pip install -r "%~dp0requirements.txt"
) else if exist "%~dp0..\requirements.txt" (
    pip install -r "%~dp0..\requirements.txt"
)

set "ICON_ARG="
if exist "%~dp0assets\app.ico" (
    set "ICON_ARG=--icon=%~dp0assets\app.ico"
)

if exist "%~dp0build" rmdir /s /q "%~dp0build"
if exist "%~dp0dist\TreeForge.exe" del /f /q "%~dp0dist\TreeForge.exe"

set "TARGET_MAIN=%~dp0main.py"
if not exist "!TARGET_MAIN!" (
    if exist "%~dp0..\main.py" set "TARGET_MAIN=%~dp0..\main.py"
)

echo [*] Target main script: !TARGET_MAIN!
echo [*] Building standalone executable...
echo.

pyinstaller --noconsole ^
    --onefile ^
    --clean ^
    --name="TreeForge" ^
    !ICON_ARG! ^
    --add-data="assets;assets" ^
    --add-data="core;core" ^
    --add-data="services;services" ^
    --add-data="ui;ui" ^
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
pause
exit /b 1

:build_failed
echo [ERROR] Build failed!
pause
exit /b 1
