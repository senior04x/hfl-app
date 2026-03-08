import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    SafeAreaView,
    StatusBar
} from 'react-native';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';

export default function WelcomeScreen() {
    const setGuest = useAuthStore((state) => state.setGuest);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.brand}>HFL SPORTS</Text>
                    <Text style={styles.title}>Hush Kelibsiz!</Text>
                    <Text style={styles.description}>
                        Futbol olamidagi eng so'nggi yangiliklar va natijalarni biz bilan kuzatib boring.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => {/* TODO: Implement Login navigation */ }}
                    >
                        <Text style={styles.loginText}>Kirish</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.guestButton, { marginTop: 12, borderColor: Colors.secondary }]}
                        onPress={() => useAuthStore.getState().setAuth({ id: 'test_player_123', name: 'Player Tester', role: 'player', teamId: 'test_team_123' })}
                    >
                        <Text style={[styles.guestText, { color: Colors.secondary }]}>DEV: Test as Footballer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.guestButton, { marginTop: 12, borderColor: '#00FF66' }]}
                        onPress={() => useAuthStore.getState().setAuth({ id: 'test_coach_123', name: 'Coach Tester', role: 'coach', teamId: 'test_team_123' })}
                    >
                        <Text style={[styles.guestText, { color: '#00FF66' }]}>DEV: Test as Coach</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.guestButton, { marginTop: 12, borderColor: '#FFD700' }]}
                        onPress={() => useAuthStore.getState().setAuth({ id: 'test_league_123', name: 'League Admin', role: 'league' })}
                    >
                        <Text style={[styles.guestText, { color: '#FFD700' }]}>DEV: Test as League Admin</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.guestButton}
                        onPress={() => setGuest(true)}
                    >
                        <Text style={styles.guestText}>Mehmon sifatida davom etish</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    overlay: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(10, 13, 20, 0.8)',
    },
    content: {
        marginTop: 100,
        alignItems: 'center',
    },
    brand: {
        color: Colors.primary,
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 20,
    },
    title: {
        color: Colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        color: Colors.textMuted,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        marginBottom: 40,
    },
    loginButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    loginText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    guestButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    guestText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
