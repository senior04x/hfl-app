export const Translations = {
    positions: {
        'GK': 'Darvozabon',
        'GK-A': 'Darvozabon',
        'DF': 'Himoyachi',
        'DF-A': 'Himoyachi',
        'MF': 'Yarim himoyachi',
        'MF-A': 'Yarim himoyachi',
        'FW': 'Hujumchi',
        'FW-A': 'Hujumchi',
        'PLAYER': 'O\'yinchi',
        'COACH': 'Murabbiy',
        'MANAGER': 'Menejer',
    } as Record<string, string>,

    translatePosition: (position: string | undefined): string => {
        if (!position) return 'O\'yinchi';
        
        const key = position.toUpperCase();
        return Translations.positions[key] || position;
    }
};

export default Translations;
