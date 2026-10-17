@echo off
:: ==============================================================================
:: TreeForge - ملف التشغيل التلقائي وتثبيت المتطلبات (Windows Batch Script)
:: ==============================================================================
chcp 65001 >nul
setlocal enabledelayedexpansion

title TreeForge - تشغيل تطبيق سطح المكتب
color 0A

echo ==============================================================================
echo                      TreeForge Desktop Suite (PyQt6)
echo                تطبيق إنشاء المشاريع وحقن الأكواد الذكية
echo ==============================================================================
echo.

:: 1. التحقق من وجود بايثون
echo [1/4] التحقق من بيئة بايثون (Python)...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [خطأ] لم يتم العثور على بايثون مثبت على جهازك!
    echo يرجى تحميل وتثبيت Python 3.11 أو 3.12 من: https://www.python.org/downloads/
    echo وتأكد من تحديد خيار "Add Python to PATH" أثناء التثبيت.
    echo.
    pause
    exit /b 1
)

python --version
echo [✓] بايثون متوفر بنجاح.
echo.

:: 2. إنشاء وتفعيل البيئة الافتراضية (Virtual Environment)
echo [2/4] إعداد البيئة الافتراضية (venv)...
if not exist "venv\Scripts\activate.bat" (
    echo [*] إنشاء بيئة افتراضية جديدة في مجلد venv...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [تحذير] تعذر إنشاء venv، سيتم المتابعة باستخدام بيئة بايثون العامة.
    ) else (
        echo [✓] تم إنشاء البيئة الافتراضية بنجاح.
    )
)

if exist "venv\Scripts\activate.bat" (
    echo [*] تفعيل البيئة الافتراضية venv...
    call venv\Scripts\activate.bat
)
echo.

:: 3. تثبيت وتحديث المكتبات المطلوبة
echo [3/4] تثبيت وتحديث المتطلبات (PyQt6 وباقي المكتبات)...
set "REQ_FILE="
if exist "TreeForge\requirements.txt" set "REQ_FILE=TreeForge\requirements.txt"
if exist "requirements.txt" set "REQ_FILE=requirements.txt"

if not "!REQ_FILE!"=="" (
    python -m pip install --upgrade pip --quiet
    pip install -r "!REQ_FILE!"
    if %ERRORLEVEL% neq 0 (
        color 0E
        echo [تحذير] واجهت عملية تثبيت بعض المكتبات صعوبة، سيتم محاولة تشغيل التطبيق.
    ) else (
        echo [✓] تم التحقق من كافة المكتبات وتثبيتها بنجاح.
    )
) else (
    echo [تحذير] لم يتم العثور على requirements.txt، تثبيت PyQt6 مباشرة...
    pip install PyQt6
)
echo.

:: 4. تشغيل البرنامج
echo [4/4] جارٍ إطلاق TreeForge الآن...
echo ------------------------------------------------------------------------------
if exist "main.py" (
    python main.py
) else if exist "TreeForge\main.py" (
    python TreeForge\main.py
) else (
    color 0C
    echo [خطأ] تعذر العثور على ملف التشغيل main.py!
    pause
    exit /b 1
)

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo [تنبيه] توقف التطبيق مع رمز الخطأ: %ERRORLEVEL%
    pause
)

exit /b 0
