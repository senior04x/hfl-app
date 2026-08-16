import i18n from '../i18n';

export interface LocalizedError {
  title: string;
  message: string;
}

const ERROR_DICTIONARY: Record<string, { uz: string; ru: string; en: string }> = {
  // Network / Connection
  NETWORK_ERROR: {
    uz: "Internet aloqasi mavjud emas yoki server bilan bog'lanib bo'lmadi",
    ru: "Отсутствует подключение к интернету или сервер недоступен",
    en: "No internet connection or server unreachable",
  },
  TIMEOUT: {
    uz: "So'rov vaqti tugadi. Iltimos, qaytadan urinib ko'ring",
    ru: "Время ожидания истекло. Пожалуйста, попробуйте снова",
    en: "Request timed out. Please try again",
  },

  // Auth & OTP
  INVALID_PHONE: {
    uz: "Telefon raqami noto'g'ri kiritildi",
    ru: "Неверный номер телефона",
    en: "Invalid phone number",
  },
  PHONE_NOT_FOUND: {
    uz: "Ushbu raqam bilan ro'yxatdan o'tgan akkount topilmadi",
    ru: "Аккаунт с таким номером не найден",
    en: "No account found with this phone number",
  },
  INVALID_OTP: {
    uz: "Tasdiqlash kodi noto'g'ri",
    ru: "Неверный код подтверждения",
    en: "Invalid verification code",
  },
  EXPIRED_OTP: {
    uz: "Tasdiqlash kodining amal qilish muddati tugagan",
    ru: "Срок действия кода подтверждения истек",
    en: "Verification code has expired",
  },
  TOO_MANY_REQUESTS: {
    uz: "Juda ko'p urinish. Iltimos, birozdan so'ng qayta urinib ko'ring",
    ru: "Слишком много попыток. Пожалуйста, подождите немного",
    en: "Too many attempts. Please try again later",
  },
  BOT_NOT_STARTED: {
    uz: "Iltimos, avval Telegram botni ishga tushiring (/start)",
    ru: "Пожалуйста, сначала запустите Telegram бота (/start)",
    en: "Please start the Telegram bot first (/start)",
  },

  // Auth / Permissions
  UNAUTHORIZED: {
    uz: "Avtorizatsiyadan o'tilmagan. Iltimos, qayta kiring",
    ru: "Вы не авторизованы. Пожалуйста, войдите снова",
    en: "Unauthorized. Please log in again",
  },
  FORBIDDEN: {
    uz: "Ushbu amalni bajarish uchun sizda yetarli ruxsat yo'q",
    ru: "У вас недостаточно прав для выполнения этого действия",
    en: "You do not have permission to perform this action",
  },

  // Teams & Applications
  ALREADY_IN_TEAM: {
    uz: "Siz allaqachon jamoa a'zosisiz",
    ru: "Вы уже состоите в команде",
    en: "You are already a member of a team",
  },
  APPLICATION_EXISTS: {
    uz: "Siz ushbu jamoaga allaqachon ariza topshirgansiz",
    ru: "Вы уже подали заявку в эту команду",
    en: "You have already submitted an application to this team",
  },
  TRANSFER_NOT_ALLOWED: {
    uz: "Ayni vaqtda transfer darchasi yopiq",
    ru: "В данный момент трансферное окно закрыто",
    en: "Transfer window is currently closed",
  },

  // Default fallback
  DEFAULT_ERROR: {
    uz: "Kutilmagan xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring",
    ru: "Произошла непредвиденная ошибка. Попробуйте позже",
    en: "An unexpected error occurred. Please try again later",
  },
};

/**
 * Parses any backend error response, error code, or exception into a user-facing localized string
 */
export function getLocalizedErrorMessage(err: any): string {
  const currentLang = (i18n.language === 'ru' ? 'ru' : i18n.language === 'en' ? 'en' : 'uz') as 'uz' | 'ru' | 'en';

  if (!err) {
    return ERROR_DICTIONARY.DEFAULT_ERROR[currentLang];
  }

  // 1. If error is directly a known error code string
  const strVal = typeof err === 'string' ? err.trim() : (err.code || err.errorCode || err.error || err.message || '');
  const upperKey = String(strVal).toUpperCase().replace(/[-\s]/g, '_');

  if (ERROR_DICTIONARY[upperKey]) {
    return ERROR_DICTIONARY[upperKey][currentLang];
  }

  // 2. Axios / Fetch response checks
  if (err.response?.data) {
    const data = err.response.data;
    const code = data.errorCode || data.code || data.error;
    if (code && ERROR_DICTIONARY[String(code).toUpperCase()]) {
      return ERROR_DICTIONARY[String(code).toUpperCase()][currentLang];
    }
    if (data.message && typeof data.message === 'string') {
      const msgKey = String(data.message).toUpperCase().replace(/[-\s]/g, '_');
      if (ERROR_DICTIONARY[msgKey]) return ERROR_DICTIONARY[msgKey][currentLang];
    }
  }

  // 3. Network connection pattern matches
  const lowerMsg = String(err.message || strVal).toLowerCase();
  if (lowerMsg.includes('network') || lowerMsg.includes('internet') || lowerMsg.includes('failed to fetch')) {
    return ERROR_DICTIONARY.NETWORK_ERROR[currentLang];
  }
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return ERROR_DICTIONARY.TIMEOUT[currentLang];
  }
  if (lowerMsg.includes('unauthorized') || lowerMsg.includes('401')) {
    return ERROR_DICTIONARY.UNAUTHORIZED[currentLang];
  }

  // 4. Return custom server message if safe and non-technical, otherwise default error
  if (typeof err.message === 'string' && err.message.length > 0 && !err.message.includes('SQL') && !err.message.includes('SyntaxError')) {
    return err.message;
  }

  return ERROR_DICTIONARY.DEFAULT_ERROR[currentLang];
}
