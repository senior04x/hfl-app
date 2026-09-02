import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartImage from './SmartImage';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { getPositionCategory, PES_POSITION_THEMES } from '../utils/formationPresets';
import { getPlayerRatingScore } from '../screens/FormationBoard';
import { getLocalizedPosition } from '../utils/localizationUtils';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = SCREEN_WIDTH - 32;
const FIELD_HEIGHT = FIELD_WIDTH * 1.34;

interface PlayerPosition {
    id: string;
    name: string;
    number?: string | number;
    photo?: string | null;
    position?: string;
    role?: string;
    rating?: string | number;
    ovr?: number;
    x: number;
    y: number;
    goals?: number;
    assists?: number;
}

interface TacticsBoardProps {
    players: PlayerPosition[];
    teamColor?: string;
    formation?: any;
    onPlayerPress?: (player: any) => void;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, onPlayerPress }) => {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const lineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)';
    const grassStripeColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';

    return (
        <View style={styles.container}>
            <View style={styles.pitchWrapper}>
                <View style={[styles.pitch, { backgroundColor: isDark ? '#0D151E' : '#E8EEF5', borderColor: lineColor }]}>
                    {/* GRASS STRIPES */}
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.grassStripe,
                                { top: `${i * 16.66}%`, backgroundColor: i % 2 === 0 ? grassStripeColor : 'transparent' }
                            ]}
                        />
                    ))}

                    {/* PITCH MARKINGS */}
                    <View style={[styles.outerBorder, { borderColor: lineColor }]} />
                    <View style={[styles.penaltyAreaTop, { borderColor: lineColor }]} />
                    <View style={[styles.goalAreaTop, { borderColor: lineColor }]} />
                    <View style={[styles.centerLine, { backgroundColor: lineColor }]} />
                    <View style={[styles.centerCircle, { borderColor: lineColor }]} />
                    <View style={[styles.penaltyAreaBottom, { borderColor: lineColor }]} />
                    <View style={[styles.goalAreaBottom, { borderColor: lineColor }]} />

                    {players.map((player) => {
                        const xPct = Number(player.x);
                        const yPct = Number(player.y);
                        const safeX = isNaN(xPct) ? 50 : xPct;
                        const safeY = isNaN(yPct) ? 50 : yPct;
                        const left = (safeX / 100) * FIELD_WIDTH;
                        const top = (safeY / 100) * FIELD_HEIGHT;

                        const cat = getPositionCategory(player.position || player.role);
                        const posStyle = PES_POSITION_THEMES[cat];
                        const ratingVal = player.rating || getPlayerRatingScore(player);

                        return (
                            <TouchableOpacity
                                key={player.id}
                                style={[
                                    styles.playerContainer,
                                    { left: left - 32, top: top - 34 }
                                ]}
                                activeOpacity={0.85}
                                onPress={() => onPlayerPress && onPlayerPress(player)}
                            >
                                <View style={[styles.pesAvatarBox, { borderColor: posStyle.bg, backgroundColor: homeColors.surface }]}>
                                    <SmartImage
                                        uri={player.photo}
                                        style={styles.pesAvatar}
                                        borderRadius={21}
                                        fallbackIcon="person"
                                        fallbackIconSize={20}
                                    />

                                    {/* REAL RATING PILL */}
                                    {!!ratingVal && (
                                        <View style={[styles.pesRatingPill, { backgroundColor: '#111827', borderColor: posStyle.bg }]}>
                                            <Ionicons name="star" size={9} color="#F59E0B" style={{ marginRight: 1.5 }} />
                                            <Text style={styles.pesRatingPillText}>{ratingVal}</Text>
                                        </View>
                                    )}

                                    {/* NUMBER BADGE */}
                                    {!!player.number && (
                                        <View style={[styles.pesNumberBadge, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                                            <Text style={[styles.pesNumberBadgeText, { color: homeColors.textPrimary }]}>{player.number}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* NAME & POSITION TAG */}
                                <View style={[styles.pesNameTag, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                                    <Text style={[styles.pesNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                        {(player.name || '').toUpperCase()}
                                    </Text>
                                    <View style={[styles.pesPositionBadge, { backgroundColor: posStyle.bg }]}>
                                        <Text style={[styles.pesPositionBadgeText, { color: posStyle.text }]} numberOfLines={1}>
                                            {getLocalizedPosition(player.position, t).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 5,
    },
    pitchWrapper: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        position: 'relative',
    },
    pitch: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        borderRadius: 16,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    grassStripe: {
        position: 'absolute',
        width: '100%',
        height: '16.66%',
    },
    outerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        margin: 5,
        borderRadius: 12,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 1.5,
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1.5,
        marginTop: -40,
        marginLeft: -40,
    },
    penaltyAreaTop: {
        position: 'absolute',
        top: 5,
        width: '56%',
        height: '18%',
        left: '22%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    goalAreaTop: {
        position: 'absolute',
        top: 5,
        width: '28%',
        height: '6%',
        left: '36%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    penaltyAreaBottom: {
        position: 'absolute',
        bottom: 5,
        width: '56%',
        height: '18%',
        left: '22%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    goalAreaBottom: {
        position: 'absolute',
        bottom: 5,
        width: '28%',
        height: '6%',
        left: '36%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    playerContainer: {
        position: 'absolute',
        width: 64,
        alignItems: 'center',
    },
    pesAvatarBox: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    pesAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    pesRatingPill: {
        position: 'absolute',
        top: -6,
        right: -8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
    },
    pesRatingPillText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
    pesNumberBadge: {
        position: 'absolute',
        bottom: -4,
        right: -6,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
    },
    pesNumberBadgeText: {
        fontSize: 8,
        fontWeight: '900',
    },
    pesNameTag: {
        marginTop: 3,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        maxWidth: 64,
    },
    pesNameText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    pesPositionBadge: {
        marginTop: 1.5,
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 3,
        maxWidth: 58,
    },
    pesPositionBadgeText: {
        fontSize: 6.5,
        fontWeight: '900',
        textAlign: 'center',
    },
});

export default TacticsBoard;
