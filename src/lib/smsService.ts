// SMS Service for HFL Admin Panel
// Uses Eskiz.uz SMS API

interface SMSConfig {
  email: string;
  password: string;
  apiToken?: string;
}

interface SMSMessage {
  to: string;
  message: string;
  from?: string;
}

class SMSService {
  private config: SMSConfig;
  private baseUrl = 'https://notify.eskiz.uz/api';

  constructor(config: SMSConfig) {
    this.config = config;
  }

  // Get SMS token from Eskiz.uz
  private async getToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.config.email,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS Auth failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.token || data.token;
    } catch (error) {
      console.error('SMS Auth error:', error);
      throw new Error('SMS authentication failed');
    }
  }

  // Send SMS message
  async sendSMS(message: SMSMessage): Promise<boolean> {
    try {
      const token = await this.getToken();
      
      const response = await fetch(`${this.baseUrl}/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile_phone: message.to,
          message: message.message,
          from: message.from || 'HFL',
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS send failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('SMS sent successfully:', data);
      return true;
    } catch (error) {
      console.error('SMS send error:', error);
      return false;
    }
  }

  // Send application approval SMS
  async sendApplicationApprovalSMS(phone: string, applicantName: string, applicationType: 'player' | 'team' | 'league'): Promise<boolean> {
    const typeText = {
      player: 'o\'yinchi',
      team: 'jamoa',
      league: 'liga'
    }[applicationType];

    const message = `Hurmatli ${applicantName}! Sizning ${typeText} arizangiz tasdiqlandi. HFL mobil ilovasiga kirib, o'z kabinetingizga kiring. Rahmat!`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }

  // Send application rejection SMS
  async sendApplicationRejectionSMS(phone: string, applicantName: string, applicationType: 'player' | 'team' | 'league'): Promise<boolean> {
    const typeText = {
      player: 'o\'yinchi',
      team: 'jamoa',
      league: 'liga'
    }[applicationType];

    const message = `Hurmatli ${applicantName}! Sizning ${typeText} arizangiz rad etildi. Batafsil ma'lumot uchun admin bilan bog'laning. Rahmat!`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }

  // Send OTP SMS
  async sendOTPSMS(phone: string, otp: string): Promise<boolean> {
    const message = `HFL tasdiqlash kodi: ${otp}. Bu kodni hech kimga bermang!`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }

  // Send match reminder SMS
  async sendMatchReminderSMS(phone: string, matchInfo: string, matchDate: string): Promise<boolean> {
    const message = `HFL eslatma: ${matchInfo} o'yini ${matchDate} sanasida bo'lib o'tadi. O'yinni qo'ldan boy bermang!`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }

  // Send transfer notification SMS
  async sendTransferNotificationSMS(phone: string, transferInfo: string): Promise<boolean> {
    const message = `HFL transfer: ${transferInfo} haqida xabar. Batafsil ma'lumot uchun ilovaga kiring.`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }
}

// Export singleton instance
export const smsService = new SMSService({
  email: process.env.ESKIZ_EMAIL || 'your_email@example.com',
  password: process.env.ESKIZ_PASSWORD || 'your_password',
  apiToken: process.env.ESKIZ_API_TOKEN,
});

export default SMSService;
