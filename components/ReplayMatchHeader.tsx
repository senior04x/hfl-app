import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import { formatMatchTeamName } from '../utils/stringUtils';

export default function ReplayMatchHeader({ match, color = '#FFFFFF' }: { match: any; color?: string }) {
    const { t } = useTranslation();
    const home = match?.home_team || {};
    const away = match?.away_team || {};
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', color, fontSize: 11, fontWeight: '800' }}>{formatMatchTeamName(home.name || match?.home_team_name || t('matches.home_short', 'UY'))}</Text>
        <SmartImage uri={home.logo_url || match?.home_team_logo} style={{ width: 24, height: 24 }} contentFit="contain" fallbackIcon="shield-outline" fallbackIconSize={18} />
        <Text style={{ color, fontWeight: '900', fontSize: 14 }}>{match?.home_score ?? '—'} : {match?.away_score ?? '—'}</Text>
        <SmartImage uri={away.logo_url || match?.away_team_logo} style={{ width: 24, height: 24 }} contentFit="contain" fallbackIcon="shield-outline" fallbackIconSize={18} />
        <Text numberOfLines={1} style={{ flex: 1, color, fontSize: 11, fontWeight: '800' }}>{formatMatchTeamName(away.name || match?.away_team_name || t('matches.away_short', 'MEH'))}</Text>
    </View>;
}
