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
