#!/bin/bash

echo "========================================"
echo "   HFL Mobile App - Android APK Build"
echo "========================================"
echo

# 1. EAS CLI o'rnatish
echo "[1/7] EAS CLI o'rnatilmoqda..."
if ! npm install -g @expo/eas-cli; then
    echo "❌ XATOLIK: EAS CLI o'rnatishda muammo!"
    exit 1
fi
echo "✅ EAS CLI muvaffaqiyatli o'rnatildi"
echo

# 2. Expo accountga login qilish
echo "[2/7] Expo accountga login qilinmoqda..."
echo "Iltimos, Expo account ma'lumotlarini kiriting:"
if ! eas login; then
    echo "❌ XATOLIK: Login qilishda muammo!"
    exit 1
fi
echo "✅ Muvaffaqiyatli login qilindi"
echo

# 3. EAS build konfiguratsiya qilish
echo "[3/7] EAS build konfiguratsiya qilinmoqda..."
if ! eas build:configure; then
    echo "❌ XATOLIK: EAS konfiguratsiya qilishda muammo!"
    exit 1
fi
echo "✅ EAS konfiguratsiya muvaffaqiyatli"
echo

# 4. app.json faylini tekshirish va yangilash
echo "[4/7] app.json faylini tekshirish va yangilash..."
node -e "
const fs = require('fs');
const path = require('path');

try {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    let updated = false;
    
    if (!appJson.expo.android) {
        appJson.expo.android = {};
        updated = true;
    }
    
    if (!appJson.expo.android.package) {
        appJson.expo.android.package = 'com.havasfootballleague.hflmobile';
        updated = true;
    }
    
    if (!appJson.expo.android.versionCode) {
        appJson.expo.android.versionCode = 1;
        updated = true;
    }
    
    if (!appJson.expo.version) {
        appJson.expo.version = '1.0.0';
        updated = true;
    }
    
    if (updated) {
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
        console.log('✅ app.json yangilandi');
    } else {
        console.log('✅ app.json allaqachon to\'g\'ri konfiguratsiya qilingan');
    }
} catch (error) {
    console.error('❌ XATOLIK: app.json faylini o\'qishda muammo:', error.message);
    process.exit(1);
}
"

if [ $? -ne 0 ]; then
    echo "❌ XATOLIK: app.json faylini yangilashda muammo!"
    exit 1
fi
echo

# 5. eas.json faylini tekshirish va preview profili qo'shish
echo "[5/7] eas.json faylini tekshirish va preview profili qo'shish..."
node -e "
const fs = require('fs');
const path = require('path');

try {
    const easJsonPath = path.join(process.cwd(), 'eas.json');
    let easJson = {};
    
    if (fs.existsSync(easJsonPath)) {
        easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    }
    
    if (!easJson.build) {
        easJson.build = {};
    }
    
    if (!easJson.build.preview) {
        easJson.build.preview = {
            'android': {
                'buildType': 'apk'
            }
        };
        
        fs.writeFileSync(easJsonPath, JSON.stringify(easJson, null, 2));
        console.log('✅ eas.json ga preview profili qo\'shildi');
    } else {
        console.log('✅ eas.json da preview profili allaqachon mavjud');
    }
} catch (error) {
    console.error('❌ XATOLIK: eas.json faylini yangilashda muammo:', error.message);
    process.exit(1);
}
"

if [ $? -ne 0 ]; then
    echo "❌ XATOLIK: eas.json faylini yangilashda muammo!"
    exit 1
fi
echo

# 6. Android APK build qilish
echo "[6/7] Android APK build qilinmoqda..."
echo "Bu jarayon 10-15 daqiqa davom etishi mumkin..."
echo
if ! eas build -p android --profile preview; then
    echo "❌ XATOLIK: APK build qilishda muammo!"
    exit 1
fi
echo

# 7. Build tugagach, APK yuklab olish linkini ko'rsatish
echo "[7/7] APK yuklab olish linkini olish..."
echo
echo "========================================"
echo "    BUILD MUVAFFAQIYATLI TUGADI!"
echo "========================================"
echo
echo "APK yuklab olish uchun quyidagi buyruqni ishlatishingiz mumkin:"
echo
echo "eas build:list --platform android --limit 1"
echo
echo "Yoki Expo dashboard orqali: https://expo.dev/accounts/[your-username]/projects/[project-slug]/builds"
echo
echo "APK faylini yuklab olish uchun yuqoridagi linklardan birini ishlating."
echo


