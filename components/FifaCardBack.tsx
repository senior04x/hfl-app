import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SmartBlurView from './SmartBlurView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FifaCardBackProps {
    size?: 'sm' | 'md' | 'lg';
}

export default function FifaCardBack({ size = 'lg' }: FifaCardBackProps) {
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const cardHeight = cardWidth * 1.46;
    const scaleFactor = cardWidth / 260;

    return (
        <View
            style={[
                styles.container,
                {
                    width: cardWidth,
                    height: cardHeight,
                },
            ]}
        >
            {/* Outer Border Gradient */}
            <LinearGradient
                colors={['#00DF82', '#00F0FF', '#00A862', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.borderLayer}
            >
                {/* Back Body Gradient */}
                <LinearGradient
                    colors={['#042017', '#0A3B2A', '#061D15', '#020C08']}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.bodyLayer}
                >
                    {/* Geometric Watermark Lines */}
                    <View style={styles.geoLines}>
                        <View style={styles.geoLine1} />
                        <View style={styles.geoLine2} />
                        <View style={styles.geoCircle} />
                    </View>

                    {/* Top Amatora Official Header */}
                    <View style={[styles.topHeader, { marginTop: 18 * scaleFactor }]}>
                        <View style={styles.topPill}>
                            <Ionicons name="shield-checkmark" size={12 * scaleFactor} color="#00DF82" />
                            <Text style={[styles.topPillText, { fontSize: 9 * scaleFactor }]}>
                                AMATORA OFFICIAL CARD
                            </Text>
                        </View>
                    </View>

                    {/* Center Holographic Crest */}
                    <View style={styles.centerCrestContainer}>
                        <View
                            style={[
                                styles.crestAura,
                                {
                                    width: 140 * scaleFactor,
                                    height: 140 * scaleFactor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.crestShield,
                                {
                                    width: 110 * scaleFactor,
                                    height: 125 * scaleFactor,
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={['rgba(0, 223, 130, 0.25)', 'rgba(0, 240, 255, 0.1)']}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <Image
                                source={require('../assets/logo.png')}
                                style={{
                                    width: 52 * scaleFactor,
                                    height: 52 * scaleFactor,
                                }}
                                resizeMode="contain"
                            />
                            <Text
                                style={[
                                    styles.crestTitle,
                                    { fontSize: 13 * scaleFactor, marginTop: 6 * scaleFactor },
                                ]}
                            >
                                AMATORA
                            </Text>
                            <Text style={[styles.crestSubtitle, { fontSize: 8 * scaleFactor }]}>
                                LEAGUE PRO
                            </Text>
                        </View>
                    </View>

                    {/* Bottom Security / Fair Play Hologram Seal */}
                    <View style={[styles.bottomSealWrapper, { marginBottom: 14 * scaleFactor }]}>
                        <View style={styles.securityStrip}>
                            <Ionicons name="finger-print-outline" size={16 * scaleFactor} color="#00DF82" />
                            <Text style={[styles.securityText, { fontSize: 8.5 * scaleFactor }]}>
                                VERIFIED AMATORA STATS
                            </Text>
                            <Ionicons name="checkmark-done" size={14 * scaleFactor} color="#00DF82" />
                        </View>
                    </View>
                </LinearGradient>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00DF82',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        backfaceVisibility: 'hidden',
    },
    borderLayer: {
        width: '100%',
        height: '100%',
        padding: 3.5,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    bodyLayer: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 33,
        borderTopRightRadius: 33,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        overflow: 'hidden',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    geoLines: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.15,
    },
    geoLine1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 220,
        height: 220,
        borderWidth: 1,
        borderColor: '#00DF82',
        transform: [{ rotate: '45deg' }],
    },
    geoLine2: {
        position: 'absolute',
        bottom: -20,
        left: -30,
        width: 200,
        height: 200,
        borderWidth: 1,
        borderColor: '#00DF82',
        transform: [{ rotate: '30deg' }],
    },
    geoCircle: {
        position: 'absolute',
        top: '30%',
        left: '15%',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 0.8,
        borderColor: '#00DF82',
    },
    topHeader: {
        alignItems: 'center',
        width: '100%',
        zIndex: 5,
    },
    topPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0, 223, 130, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
    },
    topPillText: {
        color: '#00DF82',
        fontWeight: '900',
        letterSpacing: 1,
    },
    centerCrestContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    crestAura: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: '#00DF82',
        opacity: 0.14,
    },
    crestShield: {
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 223, 130, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(5, 20, 15, 0.85)',
        shadowColor: '#00DF82',
        shadowRadius: 16,
        shadowOpacity: 0.5,
    },
    crestTitle: {
        color: '#FFFFFF',
        fontWeight: '900',
        letterSpacing: 2,
    },
    crestSubtitle: {
        color: '#00DF82',
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 2,
    },
    bottomSealWrapper: {
        width: '100%',
        alignItems: 'center',
        zIndex: 5,
    },
    securityStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        width: '95%',
    },
    securityText: {
        color: '#E2E8F0',
        fontWeight: '800',
        letterSpacing: 1,
    },
});
