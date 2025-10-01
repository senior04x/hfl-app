# HFL APK Yangilanish Qo'llanmasi

## 1. Yangi APK Yaratish

```bash
# 1. Kod yangilanishlarni qo'shish
git add .
git commit -m "Update to v1.1.0"
git push

# 2. EAS Build orqali yangi APK yaratish
npx eas build --platform android --profile preview

# 3. APK fayl yuklab olish
# EAS dashboard dan APK ni yuklab oling
```

## 2. Yangilanish Tarqatish

### A) Email orqali
- APK faylni email orqali yuborish
- Telegram/WhatsApp orqali yuborish
- Cloud storage (Google Drive, Dropbox) orqali

### B) Web server orqali
```bash
# 1. APK ni server ga yuklash
scp hfl-app-v1.1.0.apk user@server:/var/www/downloads/

# 2. Download link yaratish
https://your-server.com/downloads/hfl-app-v1.1.0.apk
```

### C) QR Code orqali
```bash
# QR code generator
# https://your-server.com/downloads/hfl-app-v1.1.0.apk
# QR code yaratib, print qilish
```

## 3. Yangilanish Xabarnomasi

```
HFL Mobile App v1.1.0 chiqarildi!

Yangi xususiyatlar:
• Yangi o'yinlar qo'shildi
• Performance yaxshilandi
• Bug fixes

Yuklab olish: [LINK]
```

## 4. Avtomatik Yangilanish

Ilova o'zi yangilanishni tekshiradi:
- Har kuni bir marta tekshiradi
- Yangi versiya mavjud bo'lsa, xabar beradi
- Foydalanuvchi "Yangilash" tugmasini bosadi
- Yangi APK yuklab olinadi

