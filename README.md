# HFL Mobile - Havas Football League

A production-ready mobile app for the Havas Football League built with Expo, React Native, TypeScript, and Firebase.

## 🚀 Features

- **Authentication**: Email/password signup and login with user profiles
- **Real-time Updates**: Live scoreboard with Firestore real-time listeners
- **Match Management**: View matches, teams, and standings
- **Admin Panel**: Create matches, update scores, and manage the league
- **Push Notifications**: FCM notifications for score updates and match events
- **Offline Support**: Works with mock data when Firebase is not configured

## 🛠 Tech Stack

- **Frontend**: Expo + React Native + TypeScript
- **Navigation**: React Navigation (Stack + Tabs)
- **State Management**: Zustand
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## 📱 Screens

- **Home**: Upcoming matches and live scores
- **Matches**: All matches with filtering (live, upcoming, finished)
- **Teams**: Team list with player information
- **Standings**: League table with points and statistics
- **Admin**: Match creation and score management
- **Match Detail**: Real-time scoreboard with live updates
- **Team Detail**: Team information and player roster

## 🏗 Project Structure

```
hfl-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # Firebase and API services
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── __tests__/          # Test files
├── functions/              # Firebase Cloud Functions
├── firestore.rules         # Firestore security rules
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project (optional for full functionality)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd hfl-mobile
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your Firebase configuration:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_USE_MOCK_DATA=true
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/emulator:**
   ```bash
   npm run android  # Android
   npm run ios      # iOS (macOS only)
   npm run web      # Web browser
   ```

### Firebase Setup (Optional)

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com)

2. **Enable Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider

3. **Create Firestore database:**
   - Go to Firestore Database
   - Create database in test mode
   - Deploy security rules: `firebase deploy --only firestore:rules`

4. **Set up Cloud Functions:**
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

5. **Seed the database:**
   ```bash
   npm run seed
   ```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📊 Data Model

### Collections

- **users**: User profiles with admin flags
- **teams**: Team information and colors
- **players**: Player details linked to teams
- **matches**: Match data with scores and status
- **standings**: Calculated league standings

### Security Rules

- Users can read/write their own profile
- All authenticated users can read teams, players, matches, standings
- Only admins can create/update matches and standings
- Admin-only collections require admin authentication

## 🔧 Development

### Adding New Features

1. **Create types** in `src/types/index.ts`
2. **Add services** in `src/services/`
3. **Create screens** in `src/screens/`
4. **Update navigation** in `src/navigation/`
5. **Add tests** in `src/__tests__/`

### Code Quality

- **ESLint**: Configured for TypeScript and React Native
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Jest**: Unit testing for utilities

## 🚀 Deployment

### Mobile App

1. **Build for production:**
   ```bash
   expo build:android
   expo build:ios
   ```

2. **Deploy to app stores:**
   - Follow Expo's deployment guide
   - Configure app signing for iOS

### Cloud Functions

```bash
cd functions
npm run build
npm run deploy
```

## 📱 Demo Features

### Without Firebase
- Mock data for teams, players, and matches
- All UI functionality works
- No real-time updates or authentication

### With Firebase
- Real authentication and user management
- Real-time score updates
- Push notifications
- Admin functionality
- Cloud Functions for standings calculation

## 🔐 Security

- Firestore rules enforce admin-only operations
- User authentication required for all operations
- Admin flag stored in user document
- Secure score updates only by admins

## 📈 Performance

- Real-time listeners only for active matches
- Optimized Firestore queries
- Efficient state management with Zustand
- Lazy loading of screens and data

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **Firebase connection issues:**
   - Check environment variables
   - Verify Firebase project configuration
   - Enable required Firebase services

3. **TypeScript errors:**
   ```bash
   npm run type-check
   ```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Firebase documentation

---

**Happy coding! ⚽️**
