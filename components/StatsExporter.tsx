import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export interface PlayerStats {
  username: string;
  level: number;
  rank: string;
  avatarUrl?: string;
  matches: number;
  winRate: number;
  kdRatio: number;
  goals?: number;
  assists?: number;
  mvpCount?: number;
}

interface StatsExporterProps {
  stats: PlayerStats;
}

type ExportState = 'idle' | 'loading' | 'complete';

export const StatsExporter: React.FC<StatsExporterProps> = ({ stats }) => {
  const [state, setState] = useState<ExportState>('idle');

  const handleStartExport = async () => {
    if (state !== 'idle') return;
    setState('loading');

    try {
      await Share.share({
        message: `AMATORA FUTBOL STATISTIKASI\nO'yinchi: ${stats.username}\nO'yinlar: ${stats.matches}\nGollar: ${stats.goals || 0}\nAssistlar: ${stats.assists || 0}\nAmatora ilovasida!`,
      });
      setState('complete');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      console.warn('Share error:', e);
      setState('idle');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleStartExport}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? (
          <ActivityIndicator color="#000" />
        ) : state === 'complete' ? (
          <View style={styles.btnContent}>
            <Ionicons name="checkmark-circle" size={18} color="#000" />
            <Text style={styles.btnText}>YUKLANDI</Text>
          </View>
        ) : (
          <View style={styles.btnContent}>
            <Ionicons name="share-social-outline" size={18} color="#000" />
            <Text style={styles.btnText}>ULASHISH</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
});

export default StatsExporter;
