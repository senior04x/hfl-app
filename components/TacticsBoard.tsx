import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = SCREEN_WIDTH - 32;
const FIELD_HEIGHT = FIELD_WIDTH * 1.35;

interface PlayerPosition {
    id: string;
    name: string;
    number?: string | number;
    x: number;
    y: number;
    goals?: number;
    assists?: number;
}

interface TacticsBoardProps {
    players: PlayerPosition[];
    teamColor?: string;
    formation?: string;
    onPlayerPress?: (player: any) => void;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, teamColor = '#3B82F6', formation, onPlayerPress }) => {
    // Pitch stripes
    const stripes = Array.from({ length: 11 }).map((_, i) => i);

    return (
        <View style={styles.container}>
            <View style={styles.pitch}>
                {/* Grass Stripes */}
                {stripes.map(i => (
                    <View 
                        key={i} 
                        style={[
                            styles.stripe, 
                            { 
                                top: `${(i * 100) / stripes.length}%` as any, 
                                height: `${100 / stripes.length}%` as any,
                                backgroundColor: i % 2 === 0 ? '#2B5425' : '#33632D'
                            }
                        ]} 
                    />
                ))}

                {/* Pitch Markings */}
                <View style={styles.outerBorder} />
                <View style={[styles.penaltyArea, styles.topPenalty]} />
                <View style={[styles.goalArea, styles.topGoal]} />
                <View style={styles.centerLine} />
                <View style={styles.centerCircle} />
                <View style={[styles.penaltyArea, styles.bottomPenalty]} />
                <View style={[styles.goalArea, styles.bottomGoal]} />
                
                {/* Players */}
                {players.map((player) => {
                    // Position normalization from 0-100 coordinates to absolute
                    const left = (player.x / 100) * FIELD_WIDTH;
                    const top = (player.y / 100) * FIELD_HEIGHT;

                    return (
                        <View 
                            key={player.id} 
                            style={[
                                styles.playerContainer, 
                                { left: left - 30, top: top - 35 } // Center the player icon
                            ]}
                        >
                            {/* Player Goal/Badge */}
                            {((player.goals || 0) > 0) && (
                                <View style={styles.statBadge}>
                                    <Ionicons name="football" size={10} color="#000" />
                                    <Text style={styles.statBadgeText}>x{player.goals}</Text>
                                </View>
                            )}

                            {/* Football Shirt Icon */}
                            <View style={[styles.shirtIcon, { backgroundColor: teamColor }]}>
                                <Text style={styles.shirtNumber}>{player.number || ''}</Text>
                                <View style={styles.shirtSleeveLeft} />
                                <View style={styles.shirtSleeveRight} />
                            </View>

                            {/* Player Name */}
                            <Text style={styles.playerName} numberOfLines={1}>
                                {player.name}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 15,
        paddingHorizontal: 16,
    },
    pitch: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        backgroundColor: '#2D5A27',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
        position: 'relative',
        overflow: 'hidden',
    },
    stripe: {
        position: 'absolute',
        width: '100%',
    },
    outerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        margin: 4,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 1.5,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        marginTop: -40,
        marginLeft: -40,
    },
    penaltyArea: {
        position: 'absolute',
        width: '60%',
        height: '18%',
        left: '20%',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
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
        borderColor: 'rgba(255,255,255,0.4)',
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
        width: 60,
        zIndex: 5,
    },
    shirtIcon: {
        width: 32,
        height: 36,
        backgroundColor: '#F59E0B',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    shirtNumber: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    shirtSleeveLeft: {
        position: 'absolute',
        left: -8,
        top: 0,
        width: 8,
        height: 14,
        backgroundColor: 'inherit',
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 2,
    },
    shirtSleeveRight: {
        position: 'absolute',
        right: -8,
        top: 0,
        width: 8,
        height: 14,
        backgroundColor: 'inherit',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 2,
    },
    playerName: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        textAlign: 'center',
        width: 80,
    },
    statBadge: {
        position: 'absolute',
        top: -12,
        left: -10,
        backgroundColor: '#FFF',
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 1,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#000',
    },
    statBadgeText: {
        color: '#000',
        fontSize: 8,
        fontWeight: 'bold',
        marginLeft: 2,
    },
});

export default TacticsBoard;
