import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import { COLORS } from '../lib/constants';
import { BadgeDisplay } from '../components/BadgeComponents';

interface Conversation {
  channel_id: number;
  other_participant: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    created_at: string;
  } | null;
}

interface DashboardData {
  success: boolean;
  data: {
    activeAlertsCount: number;
    recentChats: Conversation[];
    badges: { id: string; name: string }[];
  };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const profile = useStore((state) => state.profile);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [badges, setBadges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<DashboardData>('fetch-dashboard');
      if (error) throw new Error(error.message || 'Failed to fetch dashboard data');
      if (!data.success || !data.data) {
        throw new Error('Invalid response from fetch-dashboard');
      }
      setActiveAlertsCount(data.data.activeAlertsCount || 0);
      setRecentChats(data.data.recentChats || []);
      setBadges(data.data.badges || []);
    } catch (error: any) {
      Alert.alert('Error', 'Could not load dashboard data: ' + error.message);
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchDashboardData();

    if (!profile?.id) return;

    let debounceTimeout: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 500;

    const alertsSubscription = supabase
      .channel(`dashboard-alerts-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_alerts', filter: `created_by=eq.${profile.id}` }, () => {
        console.log('Alert change detected, scheduling refetch');
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fetchDashboardData(), DEBOUNCE_MS);
      })
      .subscribe();

    const badgesSubscription = supabase
      .channel(`dashboard-badges-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${profile.id}` }, () => {
        console.log('Badge change detected, scheduling refetch');
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fetchDashboardData(), DEBOUNCE_MS);
      })
      .subscribe();

    const channelsSubscription = supabase
      .channel(`dashboard-chats-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: `participant_ids@>${profile.id}` }, () => {
        console.log('Channel change detected, scheduling refetch');
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fetchDashboardData(), DEBOUNCE_MS);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        console.log('New message detected, scheduling refetch');
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fetchDashboardData(), DEBOUNCE_MS);
      })
      .subscribe();

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      supabase.removeChannel(alertsSubscription);
      supabase.removeChannel(badgesSubscription);
      supabase.removeChannel(channelsSubscription);
    };
  }, [profile, fetchDashboardData]);

  const handleAlertPress = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select('id')
        .eq('created_by', profile.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        navigation.navigate('ActiveAlert', { alert_id: data.id });
      } else {
        navigation.navigate('AlertDetails');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not check alert status: ' + error.message);
    }
  };

  const renderChatItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CrisisChat', { channel_id: item.channel_id })}
    >
      <Image
        source={{ uri: item.other_participant?.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${item.other_participant?.username?.charAt(0).toUpperCase() || 'U'}` }}
        style={styles.avatar}
      />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>@{item.other_participant?.username || 'Chat'}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.last_message?.content || 'No messages yet.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchDashboardData}
            colors={[COLORS.textPrimary]}
            progressBackgroundColor={COLORS.secondary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome, @{profile.username}</Text>
          <Text style={styles.headerSubtitle}>Your support dashboard</Text>
        </View>

        {/* Active Alerts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            <TouchableOpacity onPress={handleAlertPress}>
              <Text style={styles.sectionAction}>{activeAlertsCount > 0 ? 'View Alert' : 'Create Alert'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>
                {activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {activeAlertsCount > 0 ? 'You have active crisis alerts seeking support.' : 'No active alerts. Create one if you need help.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Chats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyChats')}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentChats.length > 0 ? (
            recentChats.map((item) => (
              <View key={item.channel_id.toString()}>
                {renderChatItem({ item })}
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Ionicons name="chatbubbles-outline" size={24} color={COLORS.textSecondary} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>No Recent Chats</Text>
                <Text style={styles.cardSubtitle}>Your conversations will appear here.</Text>
              </View>
            </View>
          )}
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Badges</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.sectionAction}>View Profile</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              {badges.length > 0 ? (
                <BadgeDisplay profile={profile} awardedBadges={badges} />
              ) : (
                <>
                  <Ionicons name="ribbon-outline" size={24} color={COLORS.textSecondary} style={styles.cardIcon} />
                  <Text style={styles.cardTitle}>No Badges Yet</Text>
                  <Text style={styles.cardSubtitle}>Earn badges by supporting the community!</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  header: {
    paddingHorizontal: 5,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionAction: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.tertiary,
    borderRadius: 12,
    padding: 15,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  cardIcon: {
    marginRight: 15,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: COLORS.primary,
  },
  cardTextContainer: {
    flex: 1,
  },
});