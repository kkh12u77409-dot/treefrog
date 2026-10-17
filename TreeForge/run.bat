@echo off
:: ==============================================================================
:: TreeForge - ملف التشغيل التلقائي وتثبيت المتطلبات (داخل مجلد TreeForge)
:: ==============================================================================
chcp 65001 >nul
setlocal enabledelayedexpansion

title TreeForge - تشغيل التطبيق
color 0A

echo ==============================================================================
echo                      TreeForge Desktop Suite (PyQt6)
echo                تطبيق إنشاء المشاريع وحقن الأكواد الذكية
echo ==============================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [خطأ] لم يتم العثور على Python مثبت على جهازك!
    echo يرجى تحميل Python 3.11 أو 3.12 من: https://www.python.org/downloads/
    pause
    exit /b 1
)

python --version
echo.

if not exist "venv\Scripts\activate.bat" (
    echo [*] إنشاء بيئة افتراضية جديدة في venv...
    python -m venv venv
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo [*] التحقق من تثبيت PyQt6 والمكتبات...
if exist "requirements.txt" (
    pip install -r requirements.txt
) else if exist "..\requirements.txt" (
    pip install -r ..\requirements.txt
) else (
    pip install PyQt6
)

echo.
echo [*] إطلاق TreeForge...
if exist "main.py" (
    python main.py
) else if exist "..\main.py" (
    python ..\main.py
)

if %ERRORLEVEL% neq 0 (
    pause
)
exit /b 0
