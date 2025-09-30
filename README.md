# HFL Admin Panel

A production-ready Next.js admin web application for managing the HFL (Havas Football League) mobile app. This admin panel manages seasons, teams, players, matches, and automatically calculates player statistics from match results.

## 🚀 Features

- **Authentication & Authorization**: Firebase Auth with admin role management
- **Season Management**: Create and manage football seasons
- **Team & Player Management**: Full CRUD operations with transfer history
- **Match Management**: Schedule matches and live scoring with event logging
- **Statistics**: Automatic player statistics calculation via Cloud Functions
- **CSV Import/Export**: Bulk operations for teams and players
- **Real-time Updates**: Live data synchronization with mobile app
- **Audit Logging**: Complete admin action tracking
- **Responsive Design**: Mobile-friendly admin interface

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Deployment**: Vercel (Frontend), Firebase (Backend)
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier

## 📁 Project Structure

```
hfl-admin/
├── src/
│   ├── app/                    # Next.js app directory
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   └── ui/               # Reusable UI components
│   ├── lib/                  # Utilities and configurations
│   ├── types/                # TypeScript type definitions
│   └── hooks/                # Custom React hooks
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       └── index.ts          # Function definitions
├── scripts/                  # Utility scripts
│   └── seed.ts              # Database seeding script
├── firebase.json             # Firebase configuration
├── firestore.rules          # Firestore security rules
└── firestore.indexes.json   # Firestore indexes
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hfl-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your Firebase configuration in `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firebase project**
   ```bash
   firebase login
   firebase init
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Start Firebase emulators** (in another terminal)
   ```bash
   npm run firebase:emulators
   ```

7. **Seed demo data**
   ```bash
   npm run seed
   ```

8. **Access the application**
   - Admin Panel: http://localhost:3000
   - Firebase Emulator UI: http://localhost:4000
   - Login: admin@hfl.com / admin123

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run type-check` - Run TypeScript type checking
- `npm run firebase:emulators` - Start Firebase emulators
- `npm run firebase:deploy` - Deploy to Firebase
- `npm run seed` - Seed demo data

### Firebase Emulator Setup

The project is configured to use Firebase emulators in development:

- **Authentication**: http://localhost:9099
- **Firestore**: http://localhost:8080
- **Functions**: http://localhost:5001
- **Emulator UI**: http://localhost:4000

### Database Schema

#### Collections

- **seasons**: Football seasons
- **teams**: Team information
- **players**: Player profiles and transfer history
- **matches**: Match schedules and results
- **statistics**: Calculated player statistics
- **admins**: Admin user accounts
- **adminLogs**: Audit trail of admin actions

#### Key Relationships

- Seasons contain multiple teams
- Teams have multiple players
- Matches belong to seasons and involve two teams
- Statistics are calculated per player per season
- All actions are logged in adminLogs

## 📱 Mobile App Integration

The admin panel feeds data to the HFL mobile app located at `../hfl-mobile`. See `mobileIntegration.md` for detailed integration instructions.

### Data Flow

1. **Admin creates season** → Mobile app shows season info
2. **Admin adds teams/players** → Mobile app displays rosters
3. **Admin schedules matches** → Mobile app shows fixtures
4. **Admin logs match events** → Statistics auto-calculated → Mobile app shows updated stats
5. **Player transfers** → Mobile app updates player info

### Real-time Synchronization

The mobile app uses Firestore real-time listeners to automatically sync:
- Match results and live scores
- Player statistics updates
- Team roster changes
- Season information

## 🚀 Deployment

### Frontend (Vercel)

1. **Connect repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on git push

### Backend (Firebase)

1. **Deploy Cloud Functions**
   ```bash
   npm run firebase:deploy
   ```

2. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Deploy Firestore indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Environment Variables

Production environment variables needed:
- All Firebase configuration variables
- `NODE_ENV=production`
- `NEXT_PUBLIC_USE_EMULATOR=false`

## 🔒 Security

### Firestore Rules

- Only authenticated admins can write data
- Mobile app has read access to public data
- Admin logs are admin-only
- All operations are audited

### Authentication

- Firebase Auth with custom claims
- Admin role verification
- Session management
- Secure token handling

## 📊 Monitoring & Analytics

### Cloud Functions Monitoring

- Function execution logs
- Performance metrics
- Error tracking
- Cost monitoring

### Admin Activity Tracking

- All admin actions logged
- User activity monitoring
- Data change tracking
- Security audit trail

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### Test Coverage

```bash
npm run test:coverage
```

### Test Structure

- Component tests for UI components
- Hook tests for custom logic
- Utility function tests
- Cloud Function tests

## 📝 API Documentation

### Cloud Functions

- `onMatchUpdate`: Recalculates player statistics when matches are updated
- `sendNotification`: Sends push notifications to mobile app users

### Firestore Collections

Detailed schema documentation in `src/types/index.ts`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary software for HFL (Havas Football League).

## 🆘 Support

For technical support or questions:
- Check the documentation
- Review the code comments
- Contact the development team

## 🔄 Updates & Maintenance

### Regular Tasks

- Monitor Cloud Function performance
- Review admin logs for suspicious activity
- Update dependencies regularly
- Backup Firestore data
- Monitor mobile app integration

### Scaling Considerations

- Firestore read/write limits
- Cloud Function concurrency
- Real-time listener limits
- Mobile app performance impact

---

**Built with ❤️ for HFL (Havas Football League)**

#   h f l - a p p  
 