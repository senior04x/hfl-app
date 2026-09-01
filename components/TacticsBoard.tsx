import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartImage from './SmartImage';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Sostavni tahrirlash (FormationBoard) sahifasi bilan AYNAN bir xil o'lcham —
// shu bilan ikkala ekranda bir xil % koordinata bir xil piksel joyga tushadi.
const FIELD_WIDTH = SCREEN_WIDTH - 40;
const FIELD_HEIGHT = FIELD_WIDTH * 1.3;

interface PlayerPosition {
    id: string;
    name: string;
    number?: string | number;
    photo?: string | null;
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

const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, teamColor = '#3B82F6', formation, onPlayerPress }) => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const lineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';

    return (
        <View style={styles.container}>
            <View style={styles.pitchWrapper}>
                <View style={[styles.pitch, { backgroundColor: homeColors.surface, borderColor: lineColor }]}>
                    <View style={[styles.outerBorder, { borderColor: lineColor }]} />
                    <View style={[styles.penaltyArea, styles.topPenalty, { borderColor: lineColor }]} />
                    <View style={[styles.goalArea, styles.topGoal, { borderColor: lineColor }]} />
                    <View style={[styles.centerLine, { backgroundColor: lineColor }]} />
                    <View style={[styles.centerCircle, { borderColor: lineColor }]} />
                    <View style={[styles.penaltyArea, styles.bottomPenalty, { borderColor: lineColor }]} />
                    <View style={[styles.goalArea, styles.bottomGoal, { borderColor: lineColor }]} />

                    {players.map((player) => {
                        const xPct = Number(player.x);
                        const yPct = Number(player.y);
                        const safeX = isNaN(xPct) ? 50 : xPct;
                        const safeY = isNaN(yPct) ? 50 : yPct;
                        const left = (safeX / 100) * FIELD_WIDTH;
                        const top = (safeY / 100) * FIELD_HEIGHT;

                        return (
                            <View
                                key={player.id}
                                style={[
                                    styles.playerContainer,
                                    { left: left - 25, top: top - 30 }
                                ]}
                            >
                                <View style={styles.avatarWrap}>
                                    <SmartImage
                                        uri={player.photo}
                                        style={styles.avatar}
                                        borderRadius={24}
                                        fallbackIcon="person"
                                        fallbackIconSize={20}
                                    />
                                    <View style={[styles.numberBadge, { backgroundColor: teamColor, borderColor: homeColors.background }]}>
                                        <Text style={styles.numberBadgeText}>{player.number || ''}</Text>
                                    </View>
                                    {((player.goals || 0) > 0) && (
                                        <View style={[styles.statBadge, { borderColor: homeColors.background }]}>
                                            <Ionicons name="football" size={9} color="#000" />
                                            <Text style={styles.statBadgeText}>{player.goals}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text
                                    style={[styles.playerName, { color: homeColors.textPrimary }]}
                                    numberOfLines={1}
                                >
                                    {player.name}
                                </Text>
                            </View>
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
        borderRadius: 15,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    outerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        margin: 4,
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
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 1.5,
        marginTop: -45,
        marginLeft: -45,
    },
    penaltyArea: {
        position: 'absolute',
        width: '60%',
        height: '18%',
        left: '20%',
        borderWidth: 1.5,
    },
    topPenalty: {
        top: 0,
        borderTopWidth: 0,
    },
    bottomPenalty: {
        bottom: 0,
        borderBottomWidth: 0,
    },
    goalArea: {
        position: 'absolute',
        width: '30%',
        height: '6%',
        left: '35%',
        borderWidth: 1.5,
    },
    topGoal: {
        top: 0,
        borderTopWidth: 0,
    },
    bottomGoal: {
        bottom: 0,
        borderBottomWidth: 0,
    },
    playerContainer: {
        position: 'absolute',
        alignItems: 'center',
        width: 50,
        zIndex: 5,
    },
    avatarWrap: {
        width: 50,
        height: 50,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    numberBadge: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    numberBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
    playerName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 3,
        textAlign: 'center',
        width: 68,
    },
    statBadge: {
        position: 'absolute',
        top: -6,
        left: -6,
        backgroundColor: '#FFF',
        borderRadius: 6,
        paddingHorizontal: 3,
        paddingVertical: 1,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 1.5,
    },
    statBadgeText: {
        color: '#000',
        fontSize: 7,
        fontWeight: 'bold',
        marginLeft: 1,
    },
});

export default TacticsBoard;
