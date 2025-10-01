import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  teamName: string;
  position?: string;
  number?: string;
  status: string;
}

class FirebaseAuthService {
  // Login with phone and password using Firebase Auth
  async loginWithPhone(phone: string, password: string): Promise<PlayerData> {
    try {
      // For Firebase Auth, we need to use email format
      // Convert phone to email format: +998901234567@hfl.com
      const email = `${phone.replace(/\s/g, '')}@hfl.com`;
      
      console.log('Firebase login attempt:', { phone, email });
      
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Firebase login successful:', user.uid);
      
      // Get player data from Firestore
      const playerDoc = await getDoc(doc(db, 'players', user.uid));
      
      if (!playerDoc.exists()) {
        throw new Error('Player data not found in Firestore');
      }
      
      const playerData = playerDoc.data() as PlayerData;
      
      return {
        id: user.uid,
        ...playerData
      };
      
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Firebase Authentication yoqilmagan. Firebase Console da Email/Password authentication yoqish kerak.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Bu telefon raqami bilan ro\'yxatdan o\'tilgan o\'yinchi topilmadi');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Noto\'g\'ri parol');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Juda ko\'p urinish. Keyinroq urinib ko\'ring');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email formati noto\'g\'ri');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Parol juda zaif');
      } else {
        throw new Error(`Login xatoligi: ${error.message}`);
      }
    }
  }

  // Register new player
  async registerPlayer(playerData: PlayerData, password: string): Promise<PlayerData> {
    try {
      const email = `${playerData.phone.replace(/\s/g, '')}@hfl.com`;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile
      await updateProfile(user, {
        displayName: `${playerData.firstName} ${playerData.lastName}`
      });
      
      // Save player data to Firestore
      await setDoc(doc(db, 'players', user.uid), {
        ...playerData,
        id: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: user.uid,
        ...playerData
      };
      
    } catch (error: any) {
      console.error('Firebase registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Bu telefon raqami allaqachon ro\'yxatdan o\'tgan');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Parol juda zaif. Kamida 6 ta belgi bo\'lishi kerak');
      } else {
        throw new Error(`Ro\'yxatdan o\'tish xatoligi: ${error.message}`);
      }
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      console.log('Firebase logout successful');
    } catch (error) {
      console.error('Firebase logout error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return auth.currentUser !== null;
  }
}

export default new FirebaseAuthService();
