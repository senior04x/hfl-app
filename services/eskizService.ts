import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ESKIZ_API_URL = 'https://notify.eskiz.uz/api';
const ESKIZ_EMAIL = 'gcccc406@gmail.com';
const ESKIZ_SECRET = 'DcPUSpJr9TkkDQYzUV4PmY3ljyqWYJZjRLwKut1f';

const TOKEN_KEY = '@eskiz_token';

class EskizService {
  private token: string | null = null;

  /**
   * Get valid Bearer Token for Eskiz API.
   * Caches token locally or requests a fresh one from /api/auth/login.
   */
  async getToken(): Promise<string> {
    try {
      if (this.token) return this.token;

      const cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (cachedToken) {
        this.token = cachedToken;
        return cachedToken;
      }

      return await this.loginAndCacheToken();
    } catch (error) {
      console.error('Error getting Eskiz token:', error);
      return await this.loginAndCacheToken();
    }
  }

  /**
   * Authenticate with Eskiz API credentials to fetch token
   */
  private async loginAndCacheToken(): Promise<string> {
    try {
      const response = await axios.post(`${ESKIZ_API_URL}/auth/login`, {
        email: ESKIZ_EMAIL,
        password: ESKIZ_SECRET,
      });

      const token = response.data?.data?.token;
      if (!token) {
        throw new Error('Eskiz API token olinmadi');
      }

      this.token = token;
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return token;
    } catch (error: any) {
      console.error('Eskiz Auth Login Error:', error?.response?.data || error.message);
      throw new Error("Eskiz tizimiga ulanishda xatolik yuz berdi");
    }
  }

  /**
   * Clear cached token if token becomes expired/invalid (401 response)
   */
  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Send SMS Verification Code via Eskiz API
   * @param phoneNumber Clean 12-digit number e.g. "998901234567"
   * @param code 6-digit verification code string
   */
  async sendVerificationSms(phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    // Format phone: remove +, spaces, dashes. Should be e.g. "998901234567"
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = `998${cleanPhone}`;
    }

    if (cleanPhone.length !== 12) {
      return { success: false, message: "Telefon raqami noto'g'ri shaklda" };
    }

    const smsMessage = `Amatora ilovasiga kirish uchun tasdiqlash kodi: ${code}`;

    let attempts = 0;
    while (attempts < 2) {
      try {
        const token = await this.getToken();

        const formData = new FormData();
        formData.append('mobile_phone', cleanPhone);
        formData.append('message', smsMessage);
        formData.append('from', '4546'); // Default Eskiz sender ID or alpha-name

        const response = await axios.post(`${ESKIZ_API_URL}/message/sms/send`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.status === 'waiting' || response.data?.id || response.data?.status === 'success') {
          return { success: true, message: 'SMS kodi telefoningizga jo\'natildi' };
        } else {
          return { success: true, message: 'SMS yuborildi' };
        }
      } catch (error: any) {
        attempts++;
        console.error(`Eskiz Send SMS Attempt ${attempts} Error:`, error?.response?.data || error.message);
        
        if (error?.response?.status === 401 && attempts === 1) {
          // Token expired, clear and retry once
          await this.clearToken();
          continue;
        }

        return {
          success: true,
          isDevFallback: true,
          message: error?.response?.data?.message || "Eskiz API ulanishda xato. (Sinov uchun kod yaratildi)",
        };
      }
    }

    return { success: true, isDevFallback: true, message: "Sinov rejimida kod yaratildi" };
  }
}

export const eskizService = new EskizService();
