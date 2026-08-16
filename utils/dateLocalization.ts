import i18n from '../i18n';

/**
 * Russian pluralization helper:
 * 1 -> form1 (минута, день, год)
 * 2-4 -> form2 (минуты, дня, года)
 * 5-0 -> form5 (минут, дней, лет)
 */
function getRussianPlural(number: number, form1: string, form2: string, form5: string): string {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return form5;
  if (n1 > 1 && n1 < 5) return form2;
  if (n1 === 1) return form1;
  return form5;
}

/**
 * Localized relative time formatter supporting correct plural forms for UZ, RU, EN
 */
export function formatLocalizedRelativeTime(
  dateInput?: string | number | Date | null,
  lang: string = i18n.language || 'uz'
): string {
  if (!dateInput) {
    return lang === 'ru' ? 'Только что' : lang === 'en' ? 'Just now' : 'Hozir';
  }

  const now = Date.now();
  const past = new Date(dateInput).getTime();
  if (isNaN(past)) {
    return lang === 'ru' ? 'Только что' : lang === 'en' ? 'Just now' : 'Hozir';
  }

  const diffInSec = Math.max(0, Math.floor((now - past) / 1000));

  if (diffInSec < 15) {
    return lang === 'ru' ? 'Только что' : lang === 'en' ? 'Just now' : 'Hozir';
  }

  if (diffInSec < 60) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInSec, 'секунду', 'секунды', 'секунд');
      return `${diffInSec} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInSec === 1 ? '1 second ago' : `${diffInSec} seconds ago`;
    }
    return `${diffInSec} soniya oldin`;
  }

  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInMin, 'минуту', 'минуты', 'минут');
      return `${diffInMin} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInMin === 1 ? '1 minute ago' : `${diffInMin} minutes ago`;
    }
    return `${diffInMin} daqiqa oldin`;
  }

  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInHours, 'час', 'часа', 'часов');
      return `${diffInHours} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }
    return `${diffInHours} soat oldin`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInDays, 'день', 'дня', 'дней');
      return `${diffInDays} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
    return `${diffInDays} kun oldin`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInDays < 30) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInWeeks, 'неделю', 'недели', 'недель');
      return `${diffInWeeks} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
    }
    return `${diffInWeeks} hafta oldin`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) {
    if (lang === 'ru') {
      const unit = getRussianPlural(diffInMonths, 'месяц', 'месяца', 'месяцев');
      return `${diffInMonths} ${unit} назад`;
    }
    if (lang === 'en') {
      return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
    }
    return `${diffInMonths} oy oldin`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  if (lang === 'ru') {
    const unit = getRussianPlural(diffInYears, 'год', 'года', 'лет');
    return `${diffInYears} ${unit} назад`;
  }
  if (lang === 'en') {
    return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
  }
  return `${diffInYears} yil oldin`;
}
