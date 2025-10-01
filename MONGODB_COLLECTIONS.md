# MongoDB Collections for HFL Project

## 🗄️ Database: `hfl_football_league`

### Collections to create:

#### 1. **players** - O'yinchilar
```javascript
{
  _id: ObjectId,
  phone: String (unique),
  firstName: String,
  lastName: String,
  position: String,
  number: String,
  teamId: ObjectId,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **admins** - Adminlar
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String,
  role: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. **teams** - Jamoalar
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  logo: String,
  players: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. **matches** - O'yinlar
```javascript
{
  _id: ObjectId,
  team1Id: ObjectId,
  team2Id: ObjectId,
  date: Date,
  status: String,
  score: {
    team1: Number,
    team2: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 5. **leagueApplications** - Liga arizalari
```javascript
{
  _id: ObjectId,
  playerId: ObjectId,
  teamId: ObjectId,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### 6. **otp_sessions** - OTP sessiyalari
```javascript
{
  _id: ObjectId,
  phone: String (unique),
  code: String,
  attempts: Number,
  expiresAt: Date,
  createdAt: Date
}
```

#### 7. **user_sessions** - Foydalanuvchi sessiyalari
```javascript
{
  _id: ObjectId,
  playerId: ObjectId,
  sessionId: String,
  expiresAt: Date,
  createdAt: Date
}
```

#### 8. **notifications** - Bildirishnomalar
```javascript
{
  _id: ObjectId,
  playerId: ObjectId,
  title: String,
  message: String,
  isRead: Boolean,
  createdAt: Date
}
```

#### 9. **settings** - Sozlamalar
```javascript
{
  _id: ObjectId,
  key: String (unique),
  value: Mixed,
  updatedAt: Date
}
```

## 📊 Indexes to create:

```javascript
// Players collection
db.players.createIndex({ "phone": 1 }, { unique: true })
db.players.createIndex({ "email": 1 }, { unique: true, sparse: true })
db.players.createIndex({ "teamId": 1 })
db.players.createIndex({ "status": 1 })

// Admins collection
db.admins.createIndex({ "email": 1 }, { unique: true })
db.admins.createIndex({ "role": 1 })
db.admins.createIndex({ "isActive": 1 })

// Matches collection
db.matches.createIndex({ "date": 1 })
db.matches.createIndex({ "team1Id": 1 })
db.matches.createIndex({ "team2Id": 1 })
db.matches.createIndex({ "status": 1 })

// OTP sessions collection
db.otp_sessions.createIndex({ "phone": 1 }, { unique: true })
db.otp_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })

// User sessions collection
db.user_sessions.createIndex({ "playerId": 1 })
db.user_sessions.createIndex({ "sessionId": 1 }, { unique: true })
db.user_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })

// Notifications collection
db.notifications.createIndex({ "playerId": 1 })
db.notifications.createIndex({ "isRead": 1 })
db.notifications.createIndex({ "createdAt": 1 })

// Settings collection
db.settings.createIndex({ "key": 1 }, { unique: true })
```
