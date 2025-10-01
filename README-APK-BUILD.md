# HFL Mobile App - Android APK Build

Bu loyiha uchun Android APK build olish uchun avtomatik skriptlar yaratilgan.

## 🚀 Tez Boshlash

### Windows uchun:

**1. Batch fayl (build-apk.bat):**
```cmd
build-apk.bat
```

**2. PowerShell skript (build-apk.ps1):**
```powershell
.\build-apk.ps1
```

### Linux/macOS uchun:

```bash
./build-apk.sh
```

## 📋 Skriptlar nima qiladi:

1. **EAS CLI o'rnatish** - `npm install -g @expo/eas-cli`
2. **Expo accountga login** - `eas login`
3. **EAS konfiguratsiya** - `eas build:configure`
4. **app.json yangilash** - Android package va versionCode qo'shish
5. **eas.json yangilash** - Preview profili qo'shish
6. **APK build** - `eas build -p android --profile preview`
7. **Download link** - APK yuklab olish linkini ko'rsatish

## ⚙️ Avtomatik sozlamalar:

### app.json ga qo'shiladigan maydonlar:
```json
{
  "expo": {
    "android": {
      "package": "com.havasfootballleague.hflmobile",
      "versionCode": 1
    },
    "version": "1.0.0"
  }
}
```

### eas.json ga qo'shiladigan profil:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## 🔧 Qo'lda ishlatish:

Agar skript ishlamasa, quyidagi buyruqlarni ketma-ket ishlating:

```bash
# 1. EAS CLI o'rnatish
npm install -g @expo/eas-cli

# 2. Login qilish
eas login

# 3. Konfiguratsiya
eas build:configure

# 4. APK build
eas build -p android --profile preview

# 5. Build ro'yxatini ko'rish
eas build:list --platform android --limit 1
```

## 📱 APK yuklab olish:

Build tugagach, quyidagi usullardan birini ishlating:

1. **Terminal orqali:**
   ```bash
   eas build:list --platform android --limit 1
   ```

2. **Expo Dashboard orqali:**
   - https://expo.dev/accounts/[your-username]/projects/[project-slug]/builds

3. **EAS CLI orqali:**
   ```bash
   eas build:download [build-id]
   ```

## ⚠️ Muhim eslatmalar:

- **Expo account** kerak (bepul)
- **Internet aloqasi** kerak
- **Build vaqti:** 10-15 daqiqa
- **APK hajmi:** ~50-100 MB
- **Android versiyasi:** 5.0+ (API 21+)

## 🆘 Muammolar:

Agar xatolik bo'lsa:
1. `eas login` qayta ishlating
2. `eas build:configure` qayta ishlating
3. Internet aloqasini tekshiring
4. Expo account ma'lumotlarini tekshiring

## 📞 Yordam:

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS CLI Docs](https://docs.expo.dev/build/setup/)
- [Expo Dashboard](https://expo.dev/)


