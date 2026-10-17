@echo off
:: ==============================================================================
:: TreeForge - ملف تحويل التطبيق إلى ملف تنفيذي مستقل (EXE) عبر PyInstaller
:: ==============================================================================
chcp 65001 >nul
setlocal enabledelayedexpansion

title TreeForge - تحويل التطبيق إلى ملف تنفيذي EXE
color 0B

echo ==============================================================================
echo                 TreeForge - إنشاء ملف تنفيذي مستقل (EXE)
echo ==============================================================================
echo.

:: 1. التحقق من وجود بايثون
echo [1/5] التحقق من بيئة بايثون...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [خطأ] لم يتم العثور على Python مثبت على جهازك!
    pause
    exit /b 1
)

python --version
echo.

:: 2. تفعيل البيئة الافتراضية إن وجدت
echo [2/5] فحص البيئة الافتراضية...
if exist "venv\Scripts\activate.bat" (
    echo [*] استخدام بيئة venv المفعلة...
    call venv\Scripts\activate.bat
)
echo.

:: 3. تثبيت PyInstaller والمكتبات اللازمة
echo [3/5] تثبيت أداة التجميع PyInstaller والمتطلبات...
pip install --upgrade pip --quiet
pip install pyinstaller PyQt6

set "REQ_FILE="
if exist "TreeForge\requirements.txt" set "REQ_FILE=TreeForge\requirements.txt"
if exist "requirements.txt" set "REQ_FILE=requirements.txt"
if not "!REQ_FILE!"=="" (
    pip install -r "!REQ_FILE!"
)
echo.

:: 4. تجهيز إعدادات التجميع (أيقونة + أصول)
echo [4/5] إعداد معلمات البناء والأصول (Assets)...
set "ICON_ARG="
if exist "TreeForge\assets\app.ico" (
    set "ICON_ARG=--icon=TreeForge\assets\app.ico"
    echo [✓] تم العثور على أيقونة التطبيق: TreeForge\assets\app.ico
) else if exist "assets\app.ico" (
    set "ICON_ARG=--icon=assets\app.ico"
    echo [✓] تم العثور على أيقونة التطبيق: assets\app.ico
)

:: تنظيف مجلدات البناء السابقة
if exist "build" rmdir /s /q "build"
if exist "dist\TreeForge.exe" del /f /q "dist\TreeForge.exe"

echo.
echo [5/5] جارٍ بناء الملف التنفيذي المستقل (Single-File Executable)...
echo الرجاء الانتظار، قد تستغرق هذه العملية دقيقة أو دقيقتين...
echo.

set "DATA_SEP=;"

pyinstaller --noconsole ^
    --onefile ^
    --clean ^
    --name="TreeForge" ^
    !ICON_ARG! ^
    --add-data="TreeForge/assets%DATA_SEP%TreeForge/assets" ^
    --add-data="TreeForge/core%DATA_SEP%TreeForge/core" ^
    --add-data="TreeForge/services%DATA_SEP%TreeForge/services" ^
    --add-data="TreeForge/ui%DATA_SEP%TreeForge/ui" ^
    main.py

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo ==============================================================================
    echo [خطأ] حدث خطأ أثناء تجميع الملف التنفيذي بواسطة PyInstaller!
    echo ==============================================================================
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [نجاح] تم إنشاء الملف التنفيذي بنجاح!
echo مسار الملف الناتج:
echo %CD%\dist\TreeForge.exe
echo ==============================================================================
echo.

:: فتح مجلد dist للمستخدم
if exist "dist\TreeForge.exe" (
    explorer "dist"
)

pause
exit /b 0
