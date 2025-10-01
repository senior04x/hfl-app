// Firebase Login Flow - HFL Mobile App

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export class FirebaseLoginFlow {
  
  // 1. Player Registration (Ro'yxatdan o'tish)
  static async registerPlayer(playerData: any, password: string) {
    try {
      // Convert phone to email format
      const email = `${playerData.phone.replace(/\s/g, '')}@hfl.com`;
      
      console.log('📱 Firebase Registration:', {
        phone: playerData.phone,
        email: email,
        name: `${playerData.firstName} ${playerData.lastName}`
      });
      
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth user created:', user.uid);
      
      // Step 2: Save player data to Firestore
      await setDoc(doc(db, 'players', user.uid), {
        ...playerData,
        id: user.uid,
        email: email,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Player data saved to Firestore');
      
      return {
        success: true,
        playerId: user.uid,
        player: { id: user.uid, ...playerData }
      };
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw new Error(`Ro'yxatdan o'tish xatoligi: ${error.message}`);
    }
  }
  
  // 2. Player Login (Kirish)
  static async loginPlayer(phone: string, password: string) {
    try {
      // Convert phone to email format
      const email = `${phone.replace(/\s/g, '')}@hfl.com`;
      
      console.log('📱 Firebase Login:', {
        phone: phone,
        email: email
      });
      
      // Step 1: Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth successful:', user.uid);
      
      // Step 2: Get player data from Firestore
      const playerDoc = await getDoc(doc(db, 'players', user.uid));
      
      if (!playerDoc.exists()) {
        throw new Error('Player data not found in Firestore');
      }
      
      const playerData = playerDoc.data();
      console.log('✅ Player data retrieved:', playerData);
      
      return {
        success: true,
        playerId: user.uid,
        player: { id: user.uid, ...playerData }
      };
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('Bu telefon raqami bilan ro\'yxatdan o\'tilgan o\'yinchi topilmadi');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Noto\'g\'ri parol');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Juda ko\'p urinish. Keyinroq urinib ko\'ring');
      } else {
        throw new Error(`Login xatoligi: ${error.message}`);
      }
    }
  }
  
  // 3. Logout
  static async logoutPlayer() {
    try {
      await signOut(auth);
      console.log('✅ Firebase logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }
  
  // 4. Listen to Auth State Changes
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
  
  // 5. Get Current User
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }
  
  // 6. Check if User is Logged In
  static isLoggedIn(): boolean {
    return auth.currentUser !== null;
  }
}

// Usage Example:
/*
// Registration
const result = await FirebaseLoginFlow.registerPlayer({
  firstName: "John",
  lastName: "Doe",
  phone: "+998901234567",
  teamName: "Real Madrid"
}, "password123");

// Login  
const loginResult = await FirebaseLoginFlow.loginPlayer("+998901234567", "password123");

// Logout
await FirebaseLoginFlow.logoutPlayer();
*/

