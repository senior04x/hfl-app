// Simple Login Service - Direct Firestore Login
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  teamName: string;
  position?: string;
  number?: string;
  status: string;
  password: string; // Store password in Firestore for simple login
}

class SimpleLoginService {
  
  // Login with phone and password directly from Firestore
  async loginWithPhone(phone: string, password: string): Promise<PlayerData> {
    try {
      console.log('Simple login attempt:', { phone, password });
      
      // Query players collection by phone number
      const playersQuery = query(
        collection(db, 'players'), 
        where('phone', '==', phone)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      
      if (playersSnapshot.empty) {
        throw new Error('Bu telefon raqami bilan ro\'yxatdan o\'tilgan o\'yinchi topilmadi');
      }
      
      const playerDoc = playersSnapshot.docs[0];
      const playerData = playerDoc.data() as PlayerData;
      
      console.log('Player found:', playerData);
      
      // Check password
      if (playerData.password !== password) {
        throw new Error('Noto\'g\'ri parol');
      }
      
      // Check if player is active
      if (playerData.status !== 'active') {
        throw new Error('O\'yinchi faol emas');
      }
      
      console.log('Login successful:', playerData.firstName, playerData.lastName);
      
      return {
        id: playerDoc.id,
        ...playerData
      };
      
    } catch (error: any) {
      console.error('Simple login error:', error);
      throw new Error(error.message || 'Login xatoligi');
    }
  }
  
  // Register new player (save to Firestore)
  async registerPlayer(playerData: Omit<PlayerData, 'id'>, password: string): Promise<PlayerData> {
    try {
      console.log('Registering player:', playerData);
      
      // Check if player already exists
      const existingPlayer = await this.loginWithPhone(playerData.phone, password);
      if (existingPlayer) {
        throw new Error('Bu telefon raqami bilan o\'yinchi allaqachon ro\'yxatdan o\'tgan');
      }
    } catch (error: any) {
      if (error.message.includes('topilmadi')) {
        // Player doesn't exist, continue with registration
        console.log('Player not found, proceeding with registration');
      } else {
        throw error;
      }
    }
    
    try {
      // Add new player to Firestore
      const { addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'players'), {
        ...playerData,
        password: password,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Player registered successfully:', docRef.id);
      
      return {
        id: docRef.id,
        ...playerData,
        password: password,
        status: 'active'
      };
      
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(`Ro'yxatdan o'tish xatoligi: ${error.message}`);
    }
  }
  
  // Update player password
  async updatePassword(playerId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      
      // Get player data
      const playerDoc = await getDoc(doc(db, 'players', playerId));
      if (!playerDoc.exists()) {
        throw new Error('O\'yinchi topilmadi');
      }
      
      const playerData = playerDoc.data();
      
      // Check old password
      if (playerData.password !== oldPassword) {
        throw new Error('Eski parol noto\'g\'ri');
      }
      
      // Update password
      await updateDoc(doc(db, 'players', playerId), {
        password: newPassword,
        updatedAt: new Date()
      });
      
      console.log('Password updated successfully');
      
    } catch (error: any) {
      console.error('Password update error:', error);
      throw new Error(`Parol yangilash xatoligi: ${error.message}`);
    }
  }
}

export default new SimpleLoginService();

