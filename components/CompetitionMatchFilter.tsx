import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getHomeScreenColors } from '../constants/homeTheme';

export type CompetitionMatchFilterValue = 'all' | 'league' | 'tournament';
export default function CompetitionMatchFilter({ value, onChange, isDark }: {
    value: CompetitionMatchFilterValue;
    onChange: (value: CompetitionMatchFilterValue) => void;
    isDark: boolean;
}) {
    const { t } = useTranslation();
    const colors = getHomeScreenColors(isDark);
    return <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['all', 'league', 'tournament'] as const).map(option =>
            <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }}
                onPress={() => onChange(option)} style={{ flex: 1, minHeight: 44,
                    borderRadius: Platform.OS === 'android' ? 8 : 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: value === option ? colors.accent : isDark ? '#141414' : '#F5F5F5' }}>
                <Text style={{ fontWeight: '700', fontSize: 12, color: value === option ? '#FFFFFF' : colors.textPrimary }}>
                    {option === 'all' ? t('common.all', 'Barchasi') : option === 'league' ? t('stats.match_league', 'Liga') : t('stats.match_tournament', 'Turnir')}
                </Text>
            </TouchableOpacity>)}
    </View>;
}
