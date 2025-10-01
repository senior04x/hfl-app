# MongoDB Atlas Setup Guide

## 🎯 HFL Project uchun MongoDB Atlas sozlash

### 1. MongoDB Atlas Account yaratish:
1. https://www.mongodb.com/atlas ga kiring
2. "Try Free" tugmasini bosing
3. Google/GitHub orqali ro'yxatdan o'ting
4. "Build a Database" tugmasini bosing

### 2. Cluster yaratish:
1. **Provider**: AWS
2. **Region**: Asia Pacific (Singapore)
3. **Cluster Name**: `hfl-cluster`
4. **Tier**: M0 (Free tier)

### 3. Database User yaratish:
1. **Username**: `hfl_user`
2. **Password**: `HFL2024Secure!`
3. **Database User Privileges**: Read and write to any database

### 4. Network Access:
1. **IP Address**: `0.0.0.0/0` (barcha IP dan ruxsat)
2. **Comment**: "HFL Production Access"

### 5. Connection String:
```
mongodb+srv://hfl_user:HFL2024Secure!@hfl-cluster.xxxxx.mongodb.net/hfl_football_league?retryWrites=true&w=majority
```

### 6. Environment Variables:
```env
# Backend (.env)
MONGODB_URI=mongodb+srv://hfl_user:HFL2024Secure!@hfl-cluster.xxxxx.mongodb.net/hfl_football_league?retryWrites=true&w=majority

# Admin (.env)
MONGODB_URI=mongodb+srv://hfl_user:HFL2024Secure!@hfl-cluster.xxxxx.mongodb.net/hfl_football_league?retryWrites=true&w=majority
```

### 7. Collections yaratish:
- `players` - O'yinchilar
- `admins` - Adminlar
- `teams` - Jamoalar
- `matches` - O'yinlar
- `leagueApplications` - Liga arizalari
- `otp_sessions` - OTP sessiyalari
- `user_sessions` - Foydalanuvchi sessiyalari
- `notifications` - Bildirishnomalar
- `settings` - Sozlamalar

### 8. Indexes yaratish:
```javascript
// Players collection
db.players.createIndex({ "phone": 1 }, { unique: true })
db.players.createIndex({ "email": 1 }, { unique: true, sparse: true })
db.players.createIndex({ "teamId": 1 })
db.players.createIndex({ "status": 1 })

// OTP sessions collection
db.otp_sessions.createIndex({ "phone": 1 }, { unique: true })
db.otp_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })
```

### 9. Test qilish:
```bash
# Backend test
cd backend
npm start

# Health check
curl http://localhost:3001/health

# OTP test
curl -X POST http://localhost:3001/api/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998933786886"}'
```

### 10. Production Deployment:
- **Backend**: Heroku
- **Database**: MongoDB Atlas
- **Mobile**: Expo Build
- **Admin**: Vercel
