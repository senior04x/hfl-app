import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  LayoutChangeEvent,
  ScrollView,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

const { width, height } = Dimensions.get('window');

interface Player { id: string; name: string; number: number; position: string; rating: number; x: number; y: number; }
interface Team { id: string; name: string; players?: any[]; }
interface FormationScreenProps { 
  team?: Team; 
  teamName?: string; 
  onSave?: (formation: Player[]) => void;
  onClose?: () => void;
}

export default function TeamFormationScreen({
  team,
  teamName,
  onSave,
  onClose
}: FormationScreenProps) {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  // Get team name from team prop or fallback to teamName prop
  const currentTeamName = team?.name || teamName || "FC BARCELONA";

  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'MESSI', number: 10, position: 'SS', rating: 98, x: 50, y: 25 },
    { id: '2', name: 'VILLA', number: 7, position: 'SS', rating: 85, x: 50, y: 20 },
    { id: '3', name: 'INIESTA', number: 8, position: 'CMF', rating: 97, x: 40, y: 45 },
    { id: '4', name: 'FABREGAS', number: 4, position: 'RMF', rating: 87, x: 60, y: 45 },
    { id: '5', name: 'XAVI', number: 6, position: 'DMF', rating: 94, x: 50, y: 60 },
    { id: '6', name: 'ADRIANO', number: 21, position: 'LB', rating: 87, x: 25, y: 75 },
    { id: '7', name: 'PUYOL', number: 5, position: 'CB', rating: 93, x: 50, y: 85 },
    { id: '8', name: 'VALDES', number: 1, position: 'GK', rating: 89, x: 50, y: 95 },
  ]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState<string | null>(null);
  const [formation, setFormation] = useState('3-3-1-1');
  
  // Substitute players (zahira o'yinchilar)
  const [substitutePlayers, setSubstitutePlayers] = useState<Player[]>([
    { id: 'sub1', name: 'PEDRO', number: 17, position: 'FWD', rating: 82, x: 0, y: 0 },
    { id: 'sub2', name: 'BUSQUETS', number: 5, position: 'DMF', rating: 89, x: 0, y: 0 },
    { id: 'sub3', name: 'ALBA', number: 18, position: 'LB', rating: 85, x: 0, y: 0 },
    { id: 'sub4', name: 'PIQUE', number: 3, position: 'CB', rating: 87, x: 0, y: 0 },
    { id: 'sub5', name: 'TER STEGEN', number: 1, position: 'GK', rating: 90, x: 0, y: 0 },
  ]);

  // Maydon haqiqiy o'lchamini olish uchun
  const [fieldSize, setFieldSize] = useState({ w: width - 32, h: height - 300 });
  const onFieldLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w && h) setFieldSize({ w, h });
  };

  // dragStart saqlaydi: playerId -> { x: startPercentX, y: startPercentY }
  const dragStart = useRef<Record<string, { x: number; y: number }>>({});

  const updatePlayerPosition = useCallback((playerId: string | null, x: number, y: number) => {
    if (!playerId) return;
    setPlayers(prev => prev.map(player =>
      player.id === playerId ? { ...player, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } : player
    ));
  }, []);

  // Handler state change: BEGAN -> saqlab qo'y, setSelected. END -> (hech narsa ayni paytda)
  const handleHandlerStateChange = useCallback((event: any, player: Player) => {
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      dragStart.current[player.id] = { x: player.x, y: player.y };
      setSelectedPlayer(player.id);
    } else if (state === State.END || state === State.CANCELLED) {
      // Clear start (optional)
      delete dragStart.current[player.id];
    }
  }, []);

  // onGestureEvent per-player: hisoblash = start + translationToPercent
  const makeOnGestureEvent = (playerId: string) => (event: any) => {
    const { translationX = 0, translationY = 0 } = event.nativeEvent;
    const start = dragStart.current[playerId];
    if (!start) return; // hali BEGAN kelmagan bo'lsa
    // translation in percent (0-100) relative to field size
    const deltaXPercent = (translationX / Math.max(1, fieldSize.w)) * 100;
    const deltaYPercent = (translationY / Math.max(1, fieldSize.h)) * 100;

    // Sensitivity tuning: agar kerak bo'lsa *0.9 yoki *0.8 qo'yish mumkin
    const newX = Math.max(2, Math.min(98, start.x + deltaXPercent));
    const newY = Math.max(2, Math.min(98, start.y + deltaYPercent));

    updatePlayerPosition(playerId, newX, newY);
  };

  const handlePlayerPress = useCallback((playerId: string) => {
    setSelectedPlayer(prev => prev === playerId ? null : playerId);
    setSelectedSubstitute(null); // Clear substitute selection when selecting field player
  }, []);

  const handleSubstitutePress = useCallback((substituteId: string) => {
    setSelectedSubstitute(prev => prev === substituteId ? null : substituteId);
    setSelectedPlayer(null); // Clear field player selection when selecting substitute
  }, []);

  const handleSwapPlayers = useCallback(() => {
    if (!selectedPlayer || !selectedSubstitute) {
      Alert.alert('Selection Required', 'Please select both a field player and a substitute player to swap.');
      return;
    }

    const fieldPlayer = players.find(p => p.id === selectedPlayer);
    const substitutePlayer = substitutePlayers.find(p => p.id === selectedSubstitute);

    if (!fieldPlayer || !substitutePlayer) return;

    // Swap players
    setPlayers(prev => prev.map(player => 
      player.id === selectedPlayer 
        ? { ...substitutePlayer, x: fieldPlayer.x, y: fieldPlayer.y, id: fieldPlayer.id }
        : player
    ));

    setSubstitutePlayers(prev => prev.map(sub => 
      sub.id === selectedSubstitute 
        ? { ...fieldPlayer, x: 0, y: 0, id: substitutePlayer.id }
        : sub
    ));

    // Clear selections
    setSelectedPlayer(null);
    setSelectedSubstitute(null);

    Alert.alert('Swap Successful', `${fieldPlayer.name} and ${substitutePlayer.name} have been swapped!`);
  }, [selectedPlayer, selectedSubstitute, players, substitutePlayers]);

  const handleSaveFormation = useCallback(() => {
    Alert.alert('Formation Saved', `${formation} formation has been saved successfully!`, [{ text: 'OK' }]);
    onSave?.(players);
  }, [formation, players, onSave]);

  const handleResetFormation = useCallback(() => {
    Alert.alert('Reset Formation', 'Are you sure you want to reset the formation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: () => {
          setPlayers(prev => prev.map((player, index) => ({
            ...player,
            x: [50, 50, 40, 60, 50, 25, 50, 50][index],
            y: [25, 20, 45, 45, 60, 75, 85, 95][index]
          })));
        }
      }
    ]);
  }, []);

  const renderPlayer = (player: Player) => {
    const isSelected = selectedPlayer === player.id;
    const isGoalkeeper = player.position === 'GK';
    let playerBackgroundColor = colors.surface;
    let playerBorderColor = colors.border;
    if (isSelected) { playerBackgroundColor = colors.primary; playerBorderColor = colors.primary; }
    else if (isGoalkeeper) { playerBackgroundColor = '#FF9800'; playerBorderColor = '#FF9800'; }

    return (
      <PanGestureHandler
        key={player.id}
        onGestureEvent={makeOnGestureEvent(player.id)}
        onHandlerStateChange={(e) => handleHandlerStateChange(e, player)}
        minDist={0}
      >
        <TouchableOpacity
          onPress={() => handlePlayerPress(player.id)}
          activeOpacity={0.8}
          style={[
            styles.player,
            {
              left: `${player.x}%`,
              top: `${player.y}%`,
              backgroundColor: playerBackgroundColor,
              borderColor: playerBorderColor,
              borderWidth: isSelected ? 3 : 2,
            }
          ]}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.playerNumber, { color: isSelected ? 'white' : (isGoalkeeper ? 'white' : colors.text) }]}>{player.number}</Text>
            <Text style={[styles.playerName, { color: isSelected ? 'white' : (isGoalkeeper ? 'white' : colors.text) }]}>{player.name}</Text>
            <Text style={[styles.playerRating, { color: isSelected ? 'white' : (isGoalkeeper ? 'white' : colors.primary) }]}>{`*${player.rating}`}</Text>
            <Text style={[styles.playerPosition, { color: isSelected ? 'white' : (isGoalkeeper ? 'white' : colors.textSecondary) }]}>{player.position}</Text>
          </View>
        </TouchableOpacity>
      </PanGestureHandler>
    );
  };

  const renderSubstitutePlayer = (player: Player) => {
    const isGoalkeeper = player.position === 'GK';
    const isSelected = selectedSubstitute === player.id;
    
    let playerBackgroundColor = colors.surface;
    let playerBorderColor = colors.border;
    if (isSelected) { 
      playerBackgroundColor = colors.primary; 
      playerBorderColor = colors.primary; 
    }
    
    return (
      <TouchableOpacity 
        key={player.id}
        style={[
          styles.substitutePlayer, 
          { 
            backgroundColor: playerBackgroundColor, 
            borderColor: playerBorderColor,
            borderWidth: isSelected ? 3 : 1
          }
        ]}
        onPress={() => handleSubstitutePress(player.id)}
      >
        <View style={[styles.substitutePlayerNumber, { backgroundColor: isGoalkeeper ? '#FF9800' : colors.primary }]}>
          <Text style={styles.substitutePlayerNumberText}>{player.number}</Text>
        </View>
        <View style={styles.substitutePlayerInfo}>
          <Text style={[styles.substitutePlayerName, { color: isSelected ? 'white' : colors.text }]}>{player.name}</Text>
          <Text style={[styles.substitutePlayerPosition, { color: isSelected ? 'white' : colors.textSecondary }]}>{player.position}</Text>
        </View>
        <View style={[styles.substitutePlayerRating, { backgroundColor: colors.primary }]}>
          <Text style={styles.substitutePlayerRatingText}>{player.rating}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.error || '#FF5722' }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
          <Text style={[styles.teamName, { color: colors.text }]}>{currentTeamName}</Text>
        </View>
        <Text style={[styles.formation, { color: colors.primary }]}>{formation}</Text>
        <Text style={[styles.tactic, { color: colors.textSecondary }]}>Quick Counter</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.fieldContainer} onLayout={onFieldLayout}>
          <View style={styles.field}>
            <View style={styles.fieldBackground} />
            <View style={styles.centerLine} />
            <View style={styles.centerCircle} />
            <View style={styles.goalAreaLeft} />
            <View style={styles.goalAreaRight} />
            <View style={styles.penaltyAreaLeft} />
            <View style={styles.penaltyAreaRight} />
          </View>

          {players.map(renderPlayer)}
        </View>

        <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.primary }]} onPress={handleSaveFormation}>
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.controlButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.error || '#FF5722' }]} onPress={handleResetFormation}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.controlButton, 
              { 
                backgroundColor: (selectedPlayer && selectedSubstitute) ? '#4CAF50' : '#9E9E9E' 
              }
            ]} 
            onPress={handleSwapPlayers}
            disabled={!selectedPlayer || !selectedSubstitute}
          >
            <Ionicons name="swap-vertical" size={20} color="white" />
            <Text style={styles.controlButtonText}>Swap</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.instructions, { backgroundColor: colors.surface }]}>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {selectedPlayer && selectedSubstitute 
              ? `Ready to swap: ${players.find(p => p.id === selectedPlayer)?.name} ↔ ${substitutePlayers.find(p => p.id === selectedSubstitute)?.name}`
              : selectedPlayer 
                ? `Field player selected: ${players.find(p => p.id === selectedPlayer)?.name} • Now select a substitute`
                : selectedSubstitute
                  ? `Substitute selected: ${substitutePlayers.find(p => p.id === selectedSubstitute)?.name} • Now select a field player`
                  : 'Tap field player to select • Tap substitute to select • Use Swap button to exchange'
            }
          </Text>
        </View>

        {/* Substitute Players Section */}
        <View style={[styles.substituteSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.substituteTitle, { color: colors.text }]}>Zahiradagi O'yinchilar</Text>
          <View style={styles.substitutePlayersList}>
            {substitutePlayers.map(renderSubstitutePlayer)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, alignItems: 'center' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 },
  closeButton: { position: 'absolute', left: 0, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  teamName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  formation: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  tactic: { fontSize: 14 },
  fieldContainer: { 
    height: Math.min(width * 1.2, 1000), 
    position: 'relative', 
    margin: 16, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  field: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fieldBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#4CAF50', borderRadius: 8 },
  centerLine: { position: 'absolute', top: 0, left: '50%', width: 2, height: '100%', backgroundColor: 'white', marginLeft: -1 },
  centerCircle: { position: 'absolute', top: '50%', left: '50%', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'white', marginTop: -30, marginLeft: -30 },
  goalAreaLeft: { position: 'absolute', top: 0, left: '35%', width: '30%', height: '10%', borderLeftWidth: 2, borderRightWidth: 2, borderColor: 'white' },
  goalAreaRight: { position: 'absolute', bottom: 0, left: '35%', width: '30%', height: '10%', borderLeftWidth: 2, borderRightWidth: 2, borderColor: 'white' },
  penaltyAreaLeft: { position: 'absolute', top: 0, left: '25%', width: '50%', height: '20%', borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2, borderColor: 'white' },
  penaltyAreaRight: { position: 'absolute', bottom: 0, left: '25%', width: '50%', height: '20%', borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: 'white' },
  player: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center', transform: [{ translateX: -30 }, { translateY: -30 }], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  playerNumber: { fontSize: 12, fontWeight: 'bold' },
  playerName: { fontSize: 8, fontWeight: '600', textAlign: 'center' },
  playerRating: { fontSize: 8, fontWeight: 'bold' },
  playerPosition: { fontSize: 7, textAlign: 'center' },
  controls: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, justifyContent: 'space-around' },
  controlButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
  controlButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  instructions: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  instructionText: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  deselectButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, alignSelf: 'center' },
  deselectButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  substituteSection: { paddingHorizontal: 10, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  substituteTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  substitutePlayersList: { flexDirection: 'column', alignItems: 'center', gap: 8 },
  substitutePlayer: { 
    width: '90%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    marginBottom: 8, 
    borderRadius: 8, 
    borderWidth: 1,
    backgroundColor: 'white'
  },
  substitutePlayerNumber: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  substitutePlayerNumberText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  substitutePlayerInfo: { flex: 1 },
  substitutePlayerName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  substitutePlayerPosition: { fontSize: 12 },
  substitutePlayerRating: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  substitutePlayerRatingText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});
