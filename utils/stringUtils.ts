export const getTeamAbbreviation = (name: string): string => {
    if (!name) return '???';
    const trimmed = name.trim();
    if (trimmed.length <= 3) return trimmed.toUpperCase();
    
    const first = trimmed[0];
    const middle = trimmed[Math.floor(trimmed.length / 2)];
    const last = trimmed[trimmed.length - 1];
    
    return (first + middle + last).toUpperCase();
};
