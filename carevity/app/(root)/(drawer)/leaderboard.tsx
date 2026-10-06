import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useScore } from '../../../context/ScoreContext';
import { useTheme } from '../../../context/ThemeContext';
import { apiGet, apiPost } from '../../../lib/api';

type LocalRanking = {
  rank: number;
  name: string;
  lifetimePoints: number;
  isCurrentUser: boolean;
};

type SquadRanking = {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
};

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<'squad' | 'local'>('squad');
  const [roomCode, setRoomCode] = useState('');
  const [squadId, setSquadId] = useState('');
  const [squadRankings, setSquadRankings] = useState<SquadRanking[]>([]);
  const [localRankings, setLocalRankings] = useState<LocalRanking[]>([]);
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const { lifetimePoints } = useScore();
  const { colors } = useTheme();

  useEffect(() => {
    apiGet<{ rankings: LocalRanking[]; district: string }>('/api/v1/leaderboard/local')
      .then((result) => {
        setLocalRankings(result.rankings);
        setDistrict(result.district);
      })
      .catch((error) => console.warn('Failed to load local leaderboard', error));
  }, [lifetimePoints]);

  const enterArena = async () => {
    if (roomCode.trim().length !== 6) return;
    setLoading(true);
    try {
      const joined = await apiPost<{ member: { squadId: string } }>('/api/v1/squads/join', {
        roomCode: roomCode.trim(),
      });
      setSquadId(joined.member.squadId);
      const result = await apiGet<{ rankings: SquadRanking[] }>(
        `/api/v1/squads/${joined.member.squadId}/leaderboard`
      );
      setSquadRankings(result.rankings);
    } catch (error) {
      console.warn('Failed to join squad', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Compete and conquer</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={[styles.tab, activeTab === 'squad' && { backgroundColor: colors.inputBackground }]} onPress={() => setActiveTab('squad')}>
          <Text style={[styles.tabText, { color: activeTab === 'squad' ? colors.text : colors.textSecondary }]}>Squad Arena</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'local' && { backgroundColor: colors.inputBackground }]} onPress={() => setActiveTab('local')}>
          <Text style={[styles.tabText, { color: activeTab === 'local' ? colors.text : colors.textSecondary }]}>Local Grid</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
        {activeTab === 'squad' ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Join a Squad</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>Enter a six-character room code.</Text>
            <TextInput
              style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="ABC123"
              placeholderTextColor={colors.textSecondary}
              value={roomCode}
              onChangeText={setRoomCode}
              maxLength={6}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.actionButton} onPress={enterArena} disabled={loading}>
              <LinearGradient colors={colors.primaryGradient} style={styles.actionGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Enter Arena</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{squadId ? 'Squad Rankings' : 'No squad joined'}</Text>
            {squadRankings.map((ranking) => (
              <RankingRow key={ranking.rank} name={ranking.name} rank={ranking.rank} points={ranking.points} colors={colors} />
            ))}
          </>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{district || 'Local District'}</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>Live rankings from the backend.</Text>
            {localRankings.map((ranking) => (
              <RankingRow key={ranking.rank} name={ranking.name} rank={ranking.rank} points={ranking.lifetimePoints} colors={colors} current={ranking.isCurrentUser} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function RankingRow({
  name,
  rank,
  points,
  colors,
  current = false,
}: {
  name: string;
  rank: number;
  points: number;
  colors: { inputBackground: string; border: string; text: string; textSecondary: string; primary: string };
  current?: boolean;
}) {
  return (
    <View style={[styles.rankingRow, { backgroundColor: colors.inputBackground, borderColor: current ? colors.primary : colors.border }]}>
      <Text style={[styles.rankNumber, { color: current ? colors.primary : colors.textSecondary }]}>{rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={[styles.rankName, { color: current ? colors.primary : colors.text }]}>{name}</Text>
        <Text style={[styles.rankPoints, { color: colors.textSecondary }]}>{points} pts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 5, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },
  card: { marginHorizontal: 20, padding: 24, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 22, fontFamily: 'Outfit_600SemiBold', marginBottom: 10, marginTop: 12 },
  descriptionText: { fontFamily: 'Outfit_400Regular', fontSize: 14, marginBottom: 20 },
  inputBox: { width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, fontFamily: 'Outfit_600SemiBold', fontSize: 18, textAlign: 'center', marginBottom: 15, letterSpacing: 2 },
  actionButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 15 },
  actionGradient: { paddingVertical: 16, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  rankingRow: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  rankNumber: { fontSize: 20, fontFamily: 'Outfit_700Bold', width: 35 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  rankPoints: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 2 },
});
