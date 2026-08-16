/**
 * AMATORA Dynamic Database Localization Utilities
 * Safely maps DB raw strings, multilingual fields, positions and notification payloads
 * to the active user language without mutating underlying data.
 */

export function normalizePosition(pos: string | undefined | null): string {
    if (!pos) return 'unknown';
    const p = String(pos).trim().toUpperCase();

    // 1. Precise Abbreviation Match (Exact)
    if (p === 'GK') return 'gk';
    if (p === 'LB') return 'lb';
    if (p === 'CB') return 'cb';
    if (p === 'RB') return 'rb';
    if (p === 'LWB') return 'lwb';
    if (p === 'RWB') return 'rwb';
    if (p === 'CDM') return 'cdm';
    if (p === 'CM') return 'cm';
    if (p === 'CAM') return 'cam';
    if (p === 'LM') return 'lm';
    if (p === 'RM') return 'rm';
    if (p === 'LW') return 'lw';
    if (p === 'RW') return 'rw';
    if (p === 'ST') return 'st';
    if (p === 'CF') return 'cf';
    if (p === 'DEF') return 'def';
    if (p === 'MID') return 'mid';
    if (p === 'FWD') return 'fwd';

    // 2. Specific Sub-positions (Phrases)
    if (p.includes('DARVOZABON') || p.includes('ВРАТАРЬ') || p.includes('GOALKEEPER')) return 'gk';
    if (p.includes('CHAP QANOT HIMOYACHISI') || p.includes('ЛЕВЫЙ ЗАЩИТНИК') || p.includes('LEFT BACK')) return 'lb';
    if (p.includes('MARKAZIY HIMOYACHI') || p.includes('ЦЕНТРАЛЬНЫЙ ЗАЩИТНИК') || p.includes('CENTER BACK')) return 'cb';
    if (p.includes("O'NG QANOT HIMOYACHISI") || p.includes('ПРАВЫЙ ЗАЩИТНИК') || p.includes('RIGHT BACK')) return 'rb';
    if (p.includes('CHAP QANOT QANOT') || p.includes('ЛЕВЫЙ ЛАТЕРАЛЬ') || p.includes('LEFT WING BACK')) return 'lwb';
    if (p.includes("O'NG QANOT QANOT") || p.includes('ПРАВЫЙ ЛАТЕРАЛЬ') || p.includes('RIGHT WING BACK')) return 'rwb';
    if (p.includes('TAYANCH') || p.includes('ОПОРНЫЙ') || p.includes('DEFENSIVE MIDFIELDER')) return 'cdm';
    if (p.includes('MARKAZIY YARIM') || p.includes('ЦЕНТРАЛЬНЫЙ ПОЛУЗАЩИТНИК') || p.includes('CENTRAL MIDFIELDER')) return 'cm';
    if (p.includes('HUJUMKOR YARIM') || p.includes('АТАКУЮЩИЙ ПОЛУЗАЩИТНИК') || p.includes('ATTACKING MIDFIELDER')) return 'cam';
    if (p.includes('CHAP QANOT YARIM') || p.includes('ЛЕВЫЙ ПОЛУЗАЩИТНИК') || p.includes('LEFT MIDFIELDER')) return 'lm';
    if (p.includes("O'NG QANOT YARIM") || p.includes('ПРАВЫЙ ПОЛУЗАЩИТНИК') || p.includes('RIGHT MIDFIELDER')) return 'rm';
    if (p.includes('CHAP QANOT HUJUMCHISI') || p.includes('ЛЕВЫЙ ВИНГЕР') || p.includes('LEFT WINGER')) return 'lw';
    if (p.includes("O'NG QANOT HUJUMCHISI") || p.includes('ПРАВЫЙ ВИНГЕР') || p.includes('RIGHT WINGER')) return 'rw';
    if (p.includes('MARKAZIY HUJUMCHI') || p.includes('ЦЕНТРАЛЬНЫЙ НАПАДАЮЩИЙ') || p.includes('STRIKER')) return 'st';
    if (p.includes('IKKINCHI HUJUMCHI') || p.includes('ОТТЯНУТЫЙ ФОРВАРД') || p.includes('CENTER FORWARD')) return 'cf';

    // 3. General Categories (Order matters: check Yarim himoyachi/Midfielder before Himoyachi/Defender)
    if (p.includes('YARIM HIMOYACHI') || p.includes('ПОЛУЗАЩИТНИК') || p.includes('MIDFIELDER')) return 'mid';
    if (p.includes('HIMOYACHI') || p.includes('ЗАЩИТНИК') || p.includes('DEFENDER')) return 'def';
    if (p.includes('HUJUMCHI') || p.includes('НАПАДАЮЩИЙ') || p.includes('FORWARD')) return 'fwd';

    return 'unknown';
}

export function getLocalizedPosition(pos: string | undefined | null, t: any): string {
    const canonicalKey = normalizePosition(pos);
    const result = t(`positions.${canonicalKey}`);
    if (result && !result.startsWith('positions.')) {
        return result;
    }
    const upperResult = t(`positions.${canonicalKey.toUpperCase()}`);
    if (upperResult && !upperResult.startsWith('positions.')) {
        return upperResult;
    }
    return pos || t('positions.unknown');
}

export function getLocalizedNewsField(news: any, field: 'title' | 'content' | 'description', language: string): string {
    if (!news) return '';
    const lang = (language || 'uz').toLowerCase();

    // Check multilingual DB columns first (e.g. title_ru, title_en, title_uz)
    const targetKey = `${field}_${lang}`;
    if (news[targetKey] && typeof news[targetKey] === 'string' && news[targetKey].trim().length > 0) {
        return news[targetKey];
    }

    // Fallback to default field
    return news[field] || '';
}

export function getLocalizedNewsCategory(category: string | undefined | null, t: any): string {
    if (!category) return t('categories.general');
    const c = String(category).toLowerCase().trim();

    if (c.includes('turnir') || c.includes('tournament') || c.includes('турнир')) return t('categories.tournament');
    if (c.includes('jamoa') || c.includes('team') || c.includes('команд')) return t('categories.team');
    if (c.includes('transfer') || c.includes('трансфер')) return t('categories.transfer');
    if (c.includes("o'yin") || c.includes('match') || c.includes('матч')) return t('categories.match');
    if (c.includes('intervyu') || c.includes('interview') || c.includes('интервью')) return t('categories.interview');

    return category.toUpperCase();
}

export function getLocalizedNotification(item: any, t: any): { title: string, subtitle: string } {
    if (!item) return { title: '', subtitle: '' };

    const type = String(item.type || item.notif_type || '').toUpperCase();
    const data = item.data || item.payload || {};

    switch (type) {
        case 'MATCH_REMINDER':
            return {
                title: t('notif_templates.MATCH_REMINDER_TITLE'),
                subtitle: t('notif_templates.MATCH_REMINDER_BODY', { 
                    teamName: data.teamName || item.team_name || 'Jamoa', 
                    minutes: data.minutes || 60 
                })
            };
        case 'APPLICATION_APPROVED':
            return {
                title: t('notif_templates.APPLICATION_APPROVED_TITLE'),
                subtitle: t('notif_templates.APPLICATION_APPROVED_BODY')
            };
        case 'APPLICATION_REJECTED':
            return {
                title: t('notif_templates.APPLICATION_REJECTED_TITLE'),
                subtitle: item.rejection_reason || data.reason || t('notif_templates.APPLICATION_REJECTED_BODY')
            };
        case 'TRANSFER_REQUEST':
            return {
                title: t('notif_templates.TRANSFER_REQUEST_TITLE'),
                subtitle: t('notif_templates.TRANSFER_REQUEST_BODY', { 
                    playerName: data.playerName || item.player_name || 'O\'yinchi' 
                })
            };
        case 'TEAM_CHAT':
        case 'CHAT_MESSAGE':
        case 'CHAT': {
            const senderName = data.senderName || item.sender_name || item.senderName || t('teams.player_fallback');
            const rawPosition = data.senderPosition || item.sender_position || item.position;
            const role = data.senderRole || item.sender_role || item.role;
            const messageText = data.messageText || item.message_text || item.text || item.subtitle || item.message || '';

            let positionText = '';
            if (role === 'manager' || role === 'coach' || role === 'trainer') {
                positionText = t('roles.trainer');
            } else if (rawPosition) {
                positionText = getLocalizedPosition(rawPosition, t);
            }

            const title = positionText 
                ? t('notif_templates.CHAT_MESSAGE_TITLE', { position: positionText, name: senderName })
                : t('notif_templates.CHAT_MESSAGE_TITLE_NO_POS', { name: senderName });

            return {
                title,
                subtitle: messageText
            };
        }
        default:
            return {
                title: item.title || t('notif_templates.SYSTEM_NOTICE_TITLE'),
                subtitle: item.subtitle || item.message || item.body || ''
            };
    }
}
