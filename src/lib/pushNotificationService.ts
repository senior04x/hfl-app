// Push Notification Service for HFL Admin Panel
// Uses Firebase Cloud Messaging (FCM)

interface PushNotificationConfig {
  serverKey: string;
  projectId: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface FCMResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class PushNotificationService {
  private config: PushNotificationConfig;
  private baseUrl = 'https://fcm.googleapis.com/fcm/send';

  constructor(config: PushNotificationConfig) {
    this.config = config;
  }

  // Send push notification to specific device
  async sendToDevice(deviceToken: string, payload: NotificationPayload): Promise<FCMResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.config.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.imageUrl,
          },
          data: payload.data || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`FCM send failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success === 1,
        messageId: result.message_id,
        error: result.error,
      };
    } catch (error) {
      console.error('FCM send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send push notification to topic (all users)
  async sendToTopic(topic: string, payload: NotificationPayload): Promise<FCMResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.config.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: `/topics/${topic}`,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.imageUrl,
          },
          data: payload.data || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`FCM send failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success === 1,
        messageId: result.message_id,
        error: result.error,
      };
    } catch (error) {
      console.error('FCM send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send match reminder notification
  async sendMatchReminder(matchInfo: string, matchDate: string, teamTokens: string[]): Promise<boolean> {
    const payload: NotificationPayload = {
      title: 'HFL O\'yin Eslatmasi',
      body: `${matchInfo} o'yini ${matchDate} sanasida bo'lib o'tadi. O'yinni qo'ldan boy bermang!`,
      data: {
        type: 'match_reminder',
        matchDate: matchDate,
      },
    };

    let successCount = 0;
    for (const token of teamTokens) {
      const result = await this.sendToDevice(token, payload);
      if (result.success) {
        successCount++;
      }
    }

    console.log(`Match reminder sent to ${successCount}/${teamTokens.length} devices`);
    return successCount > 0;
  }

  // Send application status notification
  async sendApplicationStatusNotification(
    deviceToken: string, 
    applicantName: string, 
    status: 'approved' | 'rejected',
    applicationType: 'player' | 'team' | 'league'
  ): Promise<boolean> {
    const typeText = {
      player: 'o\'yinchi',
      team: 'jamoa',
      league: 'liga'
    }[applicationType];

    const statusText = status === 'approved' ? 'tasdiqlandi' : 'rad etildi';

    const payload: NotificationPayload = {
      title: 'HFL Ariza Holati',
      body: `Hurmatli ${applicantName}! Sizning ${typeText} arizangiz ${statusText}.`,
      data: {
        type: 'application_status',
        status: status,
        applicationType: applicationType,
      },
    };

    const result = await this.sendToDevice(deviceToken, payload);
    return result.success;
  }

  // Send transfer notification
  async sendTransferNotification(
    deviceToken: string,
    transferInfo: string
  ): Promise<boolean> {
    const payload: NotificationPayload = {
      title: 'HFL Transfer Xabari',
      body: transferInfo,
      data: {
        type: 'transfer',
      },
    };

    const result = await this.sendToDevice(deviceToken, payload);
    return result.success;
  }

  // Send general announcement
  async sendAnnouncement(
    title: string,
    message: string,
    topic: string = 'all'
  ): Promise<boolean> {
    const payload: NotificationPayload = {
      title: title,
      body: message,
      data: {
        type: 'announcement',
      },
    };

    const result = await this.sendToTopic(topic, payload);
    return result.success;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService({
  serverKey: process.env.FCM_SERVER_KEY || 'your_fcm_server_key',
  projectId: process.env.FIREBASE_PROJECT_ID || 'your_project_id',
});

export default PushNotificationService;
