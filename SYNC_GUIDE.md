# HFL Project Sinxronizatsiya Qo'llanmasi

## 🎯 Umumiy Ma'lumot

HFL (Havas Football League) project ikkita asosiy qismdan iborat:
- **HFL-Mobile**: Mobil ilova (React Native + Expo)
- **HFL-Admin**: Admin panel (Next.js)
- **HFL-Backend**: API server (Node.js + Express)

## 🗄️ Database Struktura

### Bitta MongoDB Database: `hfl_football_league`

#### Collections:
- **players** - O'yinchilar (Mobile dan)
- **admins** - Adminlar (Admin dan)
- **teams** - Jamoalar
- **matches** - O'yinlar
- **leagueApplications** - Liga arizalari
- **otp_sessions** - OTP sessiyalari
- **user_sessions** - Foydalanuvchi sessiyalari
- **notifications** - Bildirishnomalar
- **settings** - Sozlamalar

## 🔗 API Endpoints

### Backend Server: `https://hfl-backend.herokuapp.com`

#### OTP Endpoints:
- `POST /api/request-otp` - OTP yuborish
- `POST /api/verify-otp` - OTP tekshirish
- `GET /health` - Server holati

#### Admin Endpoints:
- `GET /api/players` - Barcha o'yinchilar
- `GET /api/teams` - Barcha jamoalar
- `GET /api/matches` - Barcha o'yinlar
- `GET /api/applications` - Liga arizalari

## 🔧 Environment Variables

### HFL-Mobile (.env):
```env
EXPO_PUBLIC_API_BASE_URL=https://hfl-backend.herokuapp.com
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBKUuxxDkY5VnmqiDdLmL1eM0AqFaUG06E
EXPO_PUBLIC_FIREBASE_PROJECT_ID=havas-football-league
```

### HFL-Admin (.env):
```env
NEXT_PUBLIC_API_BASE_URL=https://hfl-backend.herokuapp.com
MONGODB_URI=mongodb+srv://hfl_user:password@cluster0.mongodb.net/hfl_football_league
NEXT_PUBLIC_FIREBASE_PROJECT_ID=havas-football-league
```

### HFL-Backend (.env):
```env
MONGODB_URI=mongodb+srv://hfl_user:password@cluster0.mongodb.net/hfl_football_league
ESKIZ_EMAIL=gcccc406@gmail.com
ESKIZ_PASSWORD=Xurshid2004
ESKIZ_SENDER_NAME=4546
```

## 🚀 Deployment

### 1. Backend (Heroku):
```bash
cd backend
git add .
git commit -m "Production ready"
git push heroku main
```

### 2. Mobile (Expo):
```bash
cd hfl-mobile
expo build:android
expo build:ios
```

### 3. Admin (Vercel):
```bash
cd hfl-admin
vercel --prod
```

## 📱 Data Flow

1. **Mobile App** → OTP so'rov → **Backend** → **Eskiz.uz** → SMS
2. **Mobile App** → OTP tekshirish → **Backend** → **MongoDB** → Player data
3. **Admin Panel** → Player ma'lumotlari → **MongoDB** → **Backend** → **Mobile App**

## 🔐 Xavfsizlik

- **Rate Limiting**: 15 daqiqada 10 ta so'rov
- **OTP Muddati**: 5 daqiqa
- **Maksimal Urinish**: 3 marta
- **CORS**: Faqat ruxsat berilgan domainlar
- **MongoDB**: Cloud Atlas xavfsizligi

## 📊 Monitoring

- **Backend Logs**: Heroku logs
- **Database**: MongoDB Atlas monitoring
- **SMS**: Eskiz.uz dashboard
- **Mobile**: Expo analytics

## 🛠️ Development

### Local Development:
```bash
# Backend
cd backend && npm run dev

# Mobile
cd hfl-mobile && npx expo start

# Admin
cd hfl-admin && npm run dev
```

### Production:
- **Backend**: Heroku
- **Mobile**: Expo build
- **Admin**: Vercel
- **Database**: MongoDB Atlas

## 📞 Support

Muammolar bo'lsa:
1. Loglarni tekshiring
2. Database connection ni tekshiring
3. API endpoints ni tekshiring
4. Environment variables ni tekshiring
