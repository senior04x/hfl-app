export const getTeamAbbreviation = (name: string): string => {
    if (!name || typeof name !== 'string') return '???';
    const trimmed = name.trim();
    if (trimmed.length <= 4) return trimmed.toUpperCase();
    
    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
        return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
    }
    
    const first = trimmed[0];
    const middle = trimmed[Math.floor(trimmed.length / 2)];
    const last = trimmed[trimmed.length - 1];
    
    return (first + middle + last).toUpperCase();
};

export const formatShortTeamName = (name: any, maxLen = 12): string => {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (trimmed.length <= maxLen) return trimmed;

    // Standard replacements
    let shortName = trimmed
        .replace(/football club/gi, 'FC')
        .replace(/futbol klubi/gi, 'FK')
        .replace(/jamoasi/gi, 'J.')
        .replace(/team/gi, 'T.');

    if (shortName.length <= maxLen) return shortName;

    const words = shortName.split(/\s+/);
    if (words.length > 1) {
        if (words.length === 2) {
            const first = words[0];
            const second = words[1];
            if (first.length + 3 <= maxLen) {
                return `${first} ${second.charAt(0)}.`;
            }
        }
        return words.map(w => w.charAt(0)).join('.').toUpperCase();
    }

    return shortName.substring(0, maxLen - 1) + '.';
};

export const formatLocalizedVenue = (venue: any, lang: string = 'uz'): string => {
    if (!venue || typeof venue !== 'string') return 'Amatora Arena';
    const v = venue.trim();
    
    // Check for "1-maydon", "2-maydon", "3-maydon", "Maydon 1", "Pitch 1"
    const pitchMatch = v.match(/(\d+)[-\s]*(maydon|pole|поле|pitch|field)/i) || v.match(/(maydon|pole|поле|pitch|field)[-\s]*(\d+)/i);
    if (pitchMatch) {
        const num = pitchMatch[1] && !isNaN(Number(pitchMatch[1])) ? pitchMatch[1] : pitchMatch[2];
        if (lang === 'ru') return `Поле ${num}`;
        if (lang === 'en') return `Pitch ${num}`;
        return `${num}-Maydon`;
    }

    if (v.toLowerCase().includes('amatora arena') || v.toLowerCase().includes('arena')) {
        if (lang === 'ru') return 'Аматора Арена';
        return 'Amatora Arena';
    }

    return v;
};

export const formatLocalizedDate = (dateString: any, lang: string = 'uz', customTime?: string): string => {
    if (!dateString) return lang === 'ru' ? 'Дата не указана' : lang === 'en' ? 'Date TBD' : 'Vaqt belgilanmagan';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);

    const uzMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    const ruMonths = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const monthList = lang === 'ru' ? ruMonths : lang === 'en' ? enMonths : uzMonths;
    const day = date.getDate();
    const month = monthList[date.getMonth()];
    const year = date.getFullYear();

    let timeStr = customTime ? String(customTime).trim() : '';
    if (!timeStr || !timeStr.includes(':')) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
    }

    if (lang === 'ru') return `${day} ${month}, ${year} • ${timeStr}`;
    if (lang === 'en') return `${day} ${month} ${year} • ${timeStr}`;
    return `${day}-${month}, ${year} • ${timeStr}`;
};

export const formatLocalizedLeagueName = (leagueName: any, lang: string = 'uz'): string => {
    if (!leagueName || typeof leagueName !== 'string') return 'AMATORA LIGA';
    const l = leagueName.toLowerCase();
    if (l.includes('super')) {
        if (lang === 'ru') return 'Супер Лига';
        if (lang === 'en') return 'Super League';
        return 'Super Liga';
    }
    if (l.includes('pro')) {
        if (lang === 'ru') return 'Про Лига';
        if (lang === 'en') return 'Pro League';
        return 'Pro Liga';
    }
    if (l.includes('3') || l.includes('uchinchi') || l.includes('3-liga') || l.includes('3 liga')) {
        if (lang === 'ru') return '3-я Лига';
        if (lang === 'en') return '3rd League';
        return '3-Liga';
    }
    if (l.includes('7x7') || l.includes('7') || l.includes('yetti')) {
        if (lang === 'ru') return '7x7 Лига';
        if (lang === 'en') return '7x7 League';
        return '7x7 Liga';
    }
    return leagueName;
};

