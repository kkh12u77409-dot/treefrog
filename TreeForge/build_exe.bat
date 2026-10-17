@echo off
:: ==============================================================================
:: TreeForge - ملف تجميع EXE داخل مجلد TreeForge
:: ==============================================================================
chcp 65001 >nul
setlocal enabledelayedexpansion

title TreeForge - تحويل التطبيق إلى ملف تنفيذي EXE
color 0B

echo ==============================================================================
echo                 TreeForge - تحويل التطبيق إلى EXE بواسطة PyInstaller
echo ==============================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [خطأ] لم يتم العثور على Python مثبت على جهازك!
    pause
    exit /b 1
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

pip install pyinstaller PyQt6
if exist "requirements.txt" (
    pip install -r requirements.txt
)

set "ICON_ARG="
if exist "assets\app.ico" (
    set "ICON_ARG=--icon=assets\app.ico"
)

echo [*] جارٍ تجميع الملف التنفيذي المستقل...
pyinstaller --noconsole ^
    --onefile ^
    --clean ^
    --name="TreeForge" ^
    !ICON_ARG! ^
    --add-data="assets;assets" ^
    --add-data="core;core" ^
    --add-data="services;services" ^
    --add-data="ui;ui" ^
    main.py

if %ERRORLEVEL% neq 0 (
    color 0C
    echo [خطأ] فشل التجميع.
    pause
    exit /b 1
)

echo.
echo [✓] تم تجميع TreeForge.exe بنجاح في مجلد dist!
explorer "dist"
pause
exit /b 0
