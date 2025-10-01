# HFL Mobile Backend - Production Ready

HFL Mobile ilovasi uchun production-ready OTP autentifikatsiya serveri.

## Xususiyatlari

- 📱 SMS orqali OTP yuborish (Eskiz.uz API)
- 🔐 4 xonali tasdiqlash kodi
- ⏰ OTP muddati (5 daqiqa)
- 🛡️ Xavfsizlik va rate limiting
- 🚀 Tez va ishonchli

## O'rnatish

### 1. Dependencies o'rnatish

```bash
cd backend
npm install
```

### 2. Environment variables sozlash

```bash
cp env.example .env
```

`.env` faylini tahrirlang:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Eskiz.uz SMS API Configuration
ESKIZ_EMAIL=your_email@example.com
ESKIZ_PASSWORD=your_password
ESKIZ_SENDER_NAME=HFL Mobile
ESKIZ_API_TOKEN=your_api_token_here

# API Base URL
API_BASE_URL=http://localhost:3001

# Security
JWT_SECRET=your_jwt_secret_here
OTP_EXPIRE_MINUTES=5
MAX_OTP_ATTEMPTS=3
```

### 3. Server ishga tushirish

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### 1. OTP yuborish

```http
POST /api/request-otp
Content-Type: application/json

{
  "phone": "+998901234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tasdiqlash kodi yuborildi",
  "phone": "+998901234567",
  "expiresIn": 5
}
```

### 2. OTP tekshirish

```http
POST /api/verify-otp
Content-Type: application/json

{
  "phone": "+998901234567",
  "code": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Muvaffaqiyatli tasdiqlandi",
  "player": {
    "id": "player_001",
    "phone": "+998901234567",
    "firstName": "Ahmad",
    "lastName": "Karimov",
    "position": "Forward",
    "number": "10",
    "status": "active"
  },
  "session": {
    "playerId": "player_001",
    "sessionId": "session_1234567890",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-16T10:30:00.000Z"
  }
}
```

### 3. Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "HFL Mobile Backend is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Eskiz.uz API sozlash

1. [Eskiz.uz](https://eskiz.uz) saytiga kiring
2. Ro'yxatdan o'ting yoki kirish qiling
3. API token oling
4. `.env` faylida sozlang:

```env
ESKIZ_EMAIL=your_email@eskiz.uz
ESKIZ_PASSWORD=your_password
ESKIZ_SENDER_NAME=HFL Mobile
```

## Xavfsizlik

- Rate limiting: 10 so'rov/15 daqiqa
- OTP muddati: 5 daqiqa
- Maksimal urinish: 3 marta
- CORS sozlamalari
- Helmet security headers

## Development

```bash
# Development mode (nodemon)
npm run dev

# Production mode
npm start
```

## Logs

Server barcha jarayonlarni console ga yozadi:
- 📱 OTP so'rovlari
- 🔐 Kod tekshirish
- 📤 SMS yuborish
- ❌ Xatoliklar

## Troubleshooting

### SMS yuborilmayapti
1. Eskiz.uz credentials to'g'ri ekanligini tekshiring
2. Balance yetarli ekanligini tekshiring
3. Sender name to'g'ri ekanligini tekshiring

### Server ishlamayapti
1. Port 3001 band emasligini tekshiring
2. Dependencies o'rnatilganligini tekshiring
3. Environment variables to'g'ri ekanligini tekshiring

## Support

Muammolar bo'lsa, loyiha adminiga murojaat qiling.
