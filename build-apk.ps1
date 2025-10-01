# HFL Mobile App - Android APK Build Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   HFL Mobile App - Android APK Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. EAS CLI o'rnatish
Write-Host "[1/7] EAS CLI o'rnatilmoqda..." -ForegroundColor Yellow
try {
    npm install -g @expo/eas-cli
    Write-Host "✅ EAS CLI muvaffaqiyatli o'rnatildi" -ForegroundColor Green
} catch {
    Write-Host "❌ XATOLIK: EAS CLI o'rnatishda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 2. Expo accountga login qilish
Write-Host "[2/7] Expo accountga login qilinmoqda..." -ForegroundColor Yellow
Write-Host "Iltimos, Expo account ma'lumotlarini kiriting:" -ForegroundColor White
try {
    eas login
    Write-Host "✅ Muvaffaqiyatli login qilindi" -ForegroundColor Green
} catch {
    Write-Host "❌ XATOLIK: Login qilishda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 3. EAS build konfiguratsiya qilish
Write-Host "[3/7] EAS build konfiguratsiya qilinmoqda..." -ForegroundColor Yellow
try {
    eas build:configure
    Write-Host "✅ EAS konfiguratsiya muvaffaqiyatli" -ForegroundColor Green
} catch {
    Write-Host "❌ XATOLIK: EAS konfiguratsiya qilishda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 4. app.json faylini tekshirish va yangilash
Write-Host "[4/7] app.json faylini tekshirish va yangilash..." -ForegroundColor Yellow
try {
    $appJsonPath = Join-Path $PWD "app.json"
    $appJson = Get-Content $appJsonPath | ConvertFrom-Json
    
    $updated = $false
    
    if (-not $appJson.expo.android) {
        $appJson.expo | Add-Member -Name "android" -Value @{} -MemberType NoteProperty
        $updated = $true
    }
    
    if (-not $appJson.expo.android.package) {
        $appJson.expo.android | Add-Member -Name "package" -Value "com.havasfootballleague.hflmobile" -MemberType NoteProperty
        $updated = $true
    }
    
    if (-not $appJson.expo.android.versionCode) {
        $appJson.expo.android | Add-Member -Name "versionCode" -Value 1 -MemberType NoteProperty
        $updated = $true
    }
    
    if (-not $appJson.expo.version) {
        $appJson.expo | Add-Member -Name "version" -Value "1.0.0" -MemberType NoteProperty
        $updated = $true
    }
    
    if ($updated) {
        $appJson | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath
        Write-Host "✅ app.json yangilandi" -ForegroundColor Green
    } else {
        Write-Host "✅ app.json allaqachon to'g'ri konfiguratsiya qilingan" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ XATOLIK: app.json faylini yangilashda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 5. eas.json faylini tekshirish va preview profili qo'shish
Write-Host "[5/7] eas.json faylini tekshirish va preview profili qo'shish..." -ForegroundColor Yellow
try {
    $easJsonPath = Join-Path $PWD "eas.json"
    $easJson = @{}
    
    if (Test-Path $easJsonPath) {
        $easJson = Get-Content $easJsonPath | ConvertFrom-Json
    }
    
    if (-not $easJson.build) {
        $easJson | Add-Member -Name "build" -Value @{} -MemberType NoteProperty
    }
    
    if (-not $easJson.build.preview) {
        $easJson.build | Add-Member -Name "preview" -Value @{
            "android" = @{
                "buildType" = "apk"
            }
        } -MemberType NoteProperty
        
        $easJson | ConvertTo-Json -Depth 10 | Set-Content $easJsonPath
        Write-Host "✅ eas.json ga preview profili qo'shildi" -ForegroundColor Green
    } else {
        Write-Host "✅ eas.json da preview profili allaqachon mavjud" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ XATOLIK: eas.json faylini yangilashda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 6. Android APK build qilish
Write-Host "[6/7] Android APK build qilinmoqda..." -ForegroundColor Yellow
Write-Host "Bu jarayon 10-15 daqiqa davom etishi mumkin..." -ForegroundColor White
Write-Host ""
try {
    eas build -p android --profile preview
    Write-Host "✅ APK build muvaffaqiyatli tugadi" -ForegroundColor Green
} catch {
    Write-Host "❌ XATOLIK: APK build qilishda muammo!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 7. Build tugagach, APK yuklab olish linkini ko'rsatish
Write-Host "[7/7] APK yuklab olish linkini olish..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    BUILD MUVAFFAQIYATLI TUGADI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "APK yuklab olish uchun quyidagi buyruqni ishlatishingiz mumkin:" -ForegroundColor White
Write-Host ""
Write-Host "eas build:list --platform android --limit 1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Yoki Expo dashboard orqali: https://expo.dev/accounts/[your-username]/projects/[project-slug]/builds" -ForegroundColor Yellow
Write-Host ""
Write-Host "APK faylini yuklab olish uchun yuqoridagi linklardan birini ishlating." -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"


