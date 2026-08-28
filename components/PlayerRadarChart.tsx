import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Svg, {
    Polygon,
    Circle,
    Line,
    Defs,
    LinearGradient,
    RadialGradient,
    Stop,
    G,
    Text as SvgText,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { calculateFifaAttributes, FifaAttributes } from '../utils/playerCardUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RadarStatItem {
    key: string;
    label: string;
    fullLabelUz: string;
    p1Value: number;
    p2Value?: number;
    maxValue?: number;
}

interface PlayerRadarChartProps {
    player1?: any;
    player2?: any;
    customStats?: RadarStatItem[];
    size?: number;
    player1Name?: string;
    player2Name?: string;
    player1Color?: string;
    player2Color?: string;
    showLegend?: boolean;
    showStatBadges?: boolean;
    onStatSelect?: (stat: RadarStatItem) => void;
}

export default function PlayerRadarChart({
    player1,
    player2,
    customStats,
    size = Math.min(SCREEN_WIDTH - 48, 340),
    player1Name = 'O\'yinchi 1',
    player2Name = 'O\'yinchi 2',
    player1Color = '#00DF82',
    player2Color = '#00F0FF',
    showLegend = true,
    showStatBadges = true,
    onStatSelect,
}: PlayerRadarChartProps) {
    const [selectedStat, setSelectedStat] = useState<RadarStatItem | null>(null);

    // Animation progress (0 -> 1)
    const animProgress = useRef(new Animated.Value(0)).current;
    const [animatedScale, setAnimatedScale] = useState(0);

    useEffect(() => {
        animProgress.setValue(0);
        const listenerId = animProgress.addListener(({ value }) => {
            setAnimatedScale(value);
        });

        Animated.spring(animProgress, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: false,
        }).start();

        return () => {
            animProgress.removeListener(listenerId);
        };
    }, [player1, player2, customStats]);

    // Build the 6 core stats
    const p1Attrs: FifaAttributes = player1?.fifaAttributes || calculateFifaAttributes(player1);
    const p2Attrs: FifaAttributes | null = player2 ? (player2?.fifaAttributes || calculateFifaAttributes(player2)) : null;

    const stats: RadarStatItem[] = customStats || [
        { key: 'pac', label: 'PAC', fullLabelUz: 'Tezlik', p1Value: p1Attrs.pac, p2Value: p2Attrs?.pac, maxValue: 99 },
        { key: 'sho', label: 'SHO', fullLabelUz: 'Zarba', p1Value: p1Attrs.sho, p2Value: p2Attrs?.sho, maxValue: 99 },
        { key: 'pas', label: 'PAS', fullLabelUz: 'Pas', p1Value: p1Attrs.pas, p2Value: p2Attrs?.pas, maxValue: 99 },
        { key: 'dri', label: 'DRI', fullLabelUz: 'Dribling', p1Value: p1Attrs.dri, p2Value: p2Attrs?.dri, maxValue: 99 },
        { key: 'def', label: 'DEF', fullLabelUz: 'Himoya', p1Value: p1Attrs.def, p2Value: p2Attrs?.def, maxValue: 99 },
        { key: 'phy', label: 'PHY', fullLabelUz: 'Jismoniy', p1Value: p1Attrs.phy, p2Value: p2Attrs?.phy, maxValue: 99 },
    ];

    const numAxes = stats.length;
    const center = size / 2;
    const maxRadius = (size / 2) * 0.65; // Leaving margin for labels
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // Helper to get angle for index
    const getAngle = (i: number) => (i * 2 * Math.PI) / numAxes - Math.PI / 2;

    // Helper to get coordinate (x,y)
    const getCoord = (value: number, max: number, angle: number, scale = 1) => {
        const normalized = Math.min(Math.max(value / (max || 100), 0), 1) * scale;
        const r = normalized * maxRadius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    // Calculate grid polygons
    const gridPolygons = gridLevels.map(lvl => {
        return stats
            .map((_, i) => {
                const angle = getAngle(i);
                const r = lvl * maxRadius;
                const x = center + r * Math.cos(angle);
                const y = center + r * Math.sin(angle);
                return `${x},${y}`;
            })
            .join(' ');
    });

    // Calculate Player 1 Polygon Points
    const p1Points = stats
        .map((st, i) => {
            const angle = getAngle(i);
            const coord = getCoord(st.p1Value, st.maxValue || 100, angle, animatedScale);
            return `${coord.x},${coord.y}`;
        })
        .join(' ');

    // Calculate Player 2 Polygon Points
    const p2Points = p2Attrs
        ? stats
              .map((st, i) => {
                  const angle = getAngle(i);
                  const coord = getCoord(st.p2Value || 0, st.maxValue || 100, angle, animatedScale);
                  return `${coord.x},${coord.y}`;
              })
              .join(' ')
        : null;

    const handleSelectStat = (st: RadarStatItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setSelectedStat(prev => (prev?.key === st.key ? null : st));
        if (onStatSelect) onStatSelect(st);
    };

    return (
        <View style={[styles.container, { width: size }]}>
            {/* SVG Radar Chart */}
            <View style={styles.chartWrapper}>
                <Svg width={size} height={size}>
                    <Defs>
                        {/* Player 1 3D Gradient */}
                        <LinearGradient id="p1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={player1Color} stopOpacity="0.45" />
                            <Stop offset="100%" stopColor={player1Color} stopOpacity="0.15" />
                        </LinearGradient>

                        {/* Player 2 3D Gradient */}
                        <LinearGradient id="p2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={player2Color} stopOpacity="0.45" />
                            <Stop offset="100%" stopColor={player2Color} stopOpacity="0.12" />
                        </LinearGradient>

                        {/* Ambient Backdrop Radial Glow */}
                        <RadialGradient id="radarCenterGlow" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                            <Stop offset="0%" stopColor="#00DF82" stopOpacity="0.18" />
                            <Stop offset="60%" stopColor="#00DF82" stopOpacity="0.05" />
                            <Stop offset="100%" stopColor="#00DF82" stopOpacity="0.0" />
                        </RadialGradient>

                        {/* Outer Holographic Ring Gradient */}
                        <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#00DF82" stopOpacity="0.6" />
                            <Stop offset="50%" stopColor="#00F0FF" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
                        </LinearGradient>
                    </Defs>

                    {/* Ambient Glow Background */}
                    <Circle cx={center} cy={center} r={maxRadius * 1.15} fill="url(#radarCenterGlow)" />

                    {/* Concentric Depth Polygon Grid */}
                    {gridPolygons.map((points, idx) => {
                        const isOuter = idx === gridPolygons.length - 1;
                        const isMid = idx === 2;
                        return (
                            <Polygon
                                key={`grid-${idx}`}
                                points={points}
                                fill={isOuter ? 'rgba(15, 23, 42, 0.45)' : 'none'}
                                stroke={
                                    isOuter
                                        ? 'url(#ringGradient)'
                                        : isMid
                                        ? 'rgba(0, 223, 130, 0.25)'
                                        : 'rgba(255, 255, 255, 0.08)'
                                }
                                strokeWidth={isOuter ? 1.8 : 1}
                                strokeDasharray={idx % 2 === 1 && !isOuter ? '4,4' : undefined}
                            />
                        );
                    })}

                    {/* Radial Spoke Lines from Center to Vertices */}
                    {stats.map((_, i) => {
                        const angle = getAngle(i);
                        const edgeX = center + maxRadius * Math.cos(angle);
                        const edgeY = center + maxRadius * Math.sin(angle);
                        return (
                            <Line
                                key={`spoke-${i}`}
                                x1={center}
                                y1={center}
                                x2={edgeX}
                                y2={edgeY}
                                stroke="rgba(255, 255, 255, 0.12)"
                                strokeWidth={1}
                            />
                        );
                    })}

                    {/* Concentric Level Indicators */}
                    {gridLevels.map((lvl, idx) => {
                        const r = lvl * maxRadius;
                        return (
                            <SvgText
                                key={`lvl-${idx}`}
                                x={center + 3}
                                y={center - r + 9}
                                fill="rgba(255, 255, 255, 0.28)"
                                fontSize="8"
                                fontWeight="700"
                            >
                                {Math.round(lvl * 100)}
                            </SvgText>
                        );
                    })}

                    {/* Player 2 Polygon (Rendered First for Depth Layering) */}
                    {p2Points && (
                        <G>
                            <Polygon
                                points={p2Points}
                                fill="url(#p2Gradient)"
                                stroke={player2Color}
                                strokeWidth={2.2}
                                strokeLinejoin="round"
                            />
                            {/* Player 2 Vertex Nodes */}
                            {stats.map((st, i) => {
                                const angle = getAngle(i);
                                const coord = getCoord(st.p2Value || 0, st.maxValue || 100, angle, animatedScale);
                                return (
                                    <Circle
                                        key={`p2-dot-${i}`}
                                        cx={coord.x}
                                        cy={coord.y}
                                        r={3.5}
                                        fill="#050914"
                                        stroke={player2Color}
                                        strokeWidth={2}
                                    />
                                );
                            })}
                        </G>
                    )}

                    {/* Player 1 Polygon */}
                    <G>
                        <Polygon
                            points={p1Points}
                            fill="url(#p1Gradient)"
                            stroke={player1Color}
                            strokeWidth={2.5}
                            strokeLinejoin="round"
                        />
                        {/* Player 1 Vertex Nodes */}
                        {stats.map((st, i) => {
                            const angle = getAngle(i);
                            const coord = getCoord(st.p1Value, st.maxValue || 100, angle, animatedScale);
                            return (
                                <G key={`p1-dot-${i}`}>
                                    <Circle
                                        cx={coord.x}
                                        cy={coord.y}
                                        r={6}
                                        fill={player1Color}
                                        fillOpacity={0.3}
                                    />
                                    <Circle
                                        cx={coord.x}
                                        cy={coord.y}
                                        r={3.8}
                                        fill="#050914"
                                        stroke={player1Color}
                                        strokeWidth={2}
                                    />
                                </G>
                            );
                        })}
                    </G>

                    {/* Center Cyber Hub Node */}
                    <Circle cx={center} cy={center} r={4} fill="#00DF82" />
                    <Circle cx={center} cy={center} r={7} fill="none" stroke="rgba(0, 223, 130, 0.4)" strokeWidth={1} />
                </Svg>

                {/* Vertex Badges / Labels on the Perimeter */}
                {showStatBadges &&
                    stats.map((st, i) => {
                        const angle = getAngle(i);
                        // Push label outside the polygon
                        const labelR = maxRadius + 24;
                        const lx = center + labelR * Math.cos(angle);
                        const ly = center + labelR * Math.sin(angle);
                        const isSelected = selectedStat?.key === st.key;

                        return (
                            <TouchableOpacity
                                key={`badge-${st.key}`}
                                activeOpacity={0.7}
                                onPress={() => handleSelectStat(st)}
                                style={[
                                    styles.statBadge,
                                    {
                                        left: lx - 34,
                                        top: ly - 16,
                                    },
                                    isSelected && styles.statBadgeSelected,
                                ]}
                            >
                                <Text style={styles.statBadgeLabel}>{st.label}</Text>
                                <View style={styles.statBadgeValues}>
                                    <Text style={[styles.statBadgeValP1, { color: player1Color }]}>
                                        {st.p1Value}
                                    </Text>
                                    {st.p2Value !== undefined && (
                                        <>
                                            <Text style={styles.statBadgeValSep}>/</Text>
                                            <Text style={[styles.statBadgeValP2, { color: player2Color }]}>
                                                {st.p2Value}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
            </View>

            {/* Selected Stat Detail Pill */}
            {selectedStat && (
                <View style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                        <Text style={styles.detailTitle}>{selectedStat.fullLabelUz} ({selectedStat.label})</Text>
                        <Text style={styles.detailSub}>Maksimal: {selectedStat.maxValue || 99}</Text>
                    </View>
                    <View style={styles.detailComparisonRow}>
                        <View style={styles.detailPlayerCol}>
                            <Text style={[styles.detailPlayerName, { color: player1Color }]}>{player1Name}</Text>
                            <Text style={styles.detailPlayerVal}>{selectedStat.p1Value}</Text>
                        </View>
                        {selectedStat.p2Value !== undefined && (
                            <>
                                <View style={styles.detailVsBadge}>
                                    <Text style={styles.detailVsText}>VS</Text>
                                </View>
                                <View style={styles.detailPlayerCol}>
                                    <Text style={[styles.detailPlayerName, { color: player2Color }]}>{player2Name}</Text>
                                    <Text style={styles.detailPlayerVal}>{selectedStat.p2Value}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            )}

            {/* Chart Legend */}
            {showLegend && (
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: player1Color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                            {player1Name}
                        </Text>
                    </View>
                    {player2 && (
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: player2Color }]} />
                            <Text style={styles.legendText} numberOfLines={1}>
                                {player2Name}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    chartWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statBadge: {
        position: 'absolute',
        width: 68,
        height: 32,
        backgroundColor: 'rgba(11, 19, 32, 0.85)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
    },
    statBadgeSelected: {
        borderColor: '#00DF82',
        backgroundColor: 'rgba(0, 223, 130, 0.15)',
        transform: [{ scale: 1.08 }],
    },
    statBadgeLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    statBadgeValues: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statBadgeValP1: {
        fontSize: 11,
        fontWeight: '900',
    },
    statBadgeValSep: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 9,
        marginHorizontal: 2,
    },
    statBadgeValP2: {
        fontSize: 11,
        fontWeight: '900',
    },
    detailCard: {
        width: '92%',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
        padding: 10,
        marginTop: 8,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    detailTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    detailSub: {
        color: '#94A3B8',
        fontSize: 10,
    },
    detailComparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    detailPlayerCol: {
        alignItems: 'center',
    },
    detailPlayerName: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    detailPlayerVal: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    detailVsBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    detailVsText: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '800',
    },
    legendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: '#F8FAFC',
        fontSize: 11,
        fontWeight: '600',
        maxWidth: 110,
    },
});
