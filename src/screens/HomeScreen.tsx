import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import { COLORS } from '../lib/constants';
import { BadgeDisplay } from '../components/BadgeComponents'; // Assuming this component exists

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
    badges: { id: number; name: string; icon_name: string }[];
  };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const profile = useStore((state) => state.profile);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [badges, setBadges] = useState<{ id: number; name: string; icon_name: string }[]>([]);
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
      .channel(`user-badges-changes-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${profile.id}` }, (payload) => {
        console.log('Badge change detected, refetching badges:', payload);
        fetchDashboardData();
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

  // Modified renderChatItem for a more compact and consistent look
  const renderChatItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.chatCard} // Using a dedicated chatCard style
      onPress={() => navigation.navigate('CrisisChat', { channel_id: item.channel_id })}
    >
      <Image
        source={{ uri: item.other_participant?.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${item.other_participant?.username?.charAt(0).toUpperCase() || 'U'}` }}
        style={styles.chatAvatar} // Dedicated avatar style
      />
      <View style={styles.chatTextContainer}>
        <Text style={styles.chatTitle}>@{item.other_participant?.username || 'Chat'}</Text>
        <Text style={styles.chatSubtitle} numberOfLines={1}>
          {item.last_message?.content || 'No messages yet.'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> {/* Add an arrow icon */}
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
            progressBackgroundColor={COLORS.secondaryBlue}
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
          <TouchableOpacity style={styles.card} onPress={handleAlertPress}> {/* Make the whole card tappable */}
            <View style={styles.cardContent}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} style={styles.cardIcon} />
              <View style={styles.cardMainText}>
                <Text style={styles.cardTitle}>
                  {activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {activeAlertsCount > 0 ? 'You have active crisis alerts seeking support.' : 'No active alerts. Create one if you need help.'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Chats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Messages</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyChats')}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentChats.length > 0 ? (
            // Display only the first 3 recent chats
            recentChats.slice(0, 3).map((item) => (
              <View key={item.channel_id.toString()} style={styles.chatCardWrapper}>
                {renderChatItem({ item })}
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Ionicons name="chatbubbles-outline" size={24} color={COLORS.textSecondary} style={styles.cardIcon} />
                <View style={styles.cardMainText}>
                  <Text style={styles.cardTitle}>No Recent Chats</Text>
                  <Text style={styles.cardSubtitle}>Your conversations will appear here.</Text>
                </View>
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
            <View style={styles.cardContentBadges}> {/* New style for badge layout */}
              {badges.length > 0 ? (
                <View style={styles.badgesGrid}> {/* Use a grid/flex layout for badges */}
                  {badges.map((badge) => (
                    <View key={badge.id} style={styles.badgeItem}>
                      <Ionicons name={badge.icon_name || 'ribbon-outline'} size={20} color={COLORS.textPrimary} style={styles.badgeIcon} />
                      <Text style={styles.badgeTitle}>{badge.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  <Ionicons name="ribbon-outline" size={24} color={COLORS.textSecondary} style={styles.cardIcon} />
                  <View style={styles.cardMainText}>
                    <Text style={styles.cardTitle}>No Badges Yet</Text>
                    <Text style={styles.cardSubtitle}>Earn badges by supporting the community!</Text>
                  </View>
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
    backgroundColor: COLORS.secondaryBlue, // Main background
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
    borderBottomColor: COLORS.border, // Blue border
    marginBottom: 20, // Add space below header
  },
  headerTitle: {
    color: COLORS.textPrimary, // White text
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary, // Light grey text
    fontSize: 16,
    marginTop: 5,
  },
  section: {
    marginBottom: 25, // Increased space between sections
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // More space between header and card
  },
  sectionTitle: {
    color: COLORS.textPrimary, // White text
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionAction: {
    color: COLORS.accentLight, // Light accent blue for actions
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.tertiaryBlue, // Lighter blue for card backgrounds
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  cardMainText: { // Added to wrap title and subtitle for better alignment
    flex: 1,
  },
  cardContentBadges: { // Separate style for badges to allow different layout
    minHeight: 60,
    justifyContent: 'center',
  },
  cardIcon: {
    marginRight: 15,
  },
  cardTitle: {
    color: COLORS.textDark, // Darker text for readability on lighter card background
    fontSize: 18,
    fontWeight: 'bold',
    // Removed flex: 1 here to let cardMainText handle it
  },
  cardSubtitle: {
    color: COLORS.darkGrey, // Slightly lighter dark text for subtitle
    fontSize: 14,
    marginTop: 2, // Small margin for subtitle
    // Removed flex: 1 here
  },
  // New styles for Chat items for better layout
  chatCardWrapper: {
    marginBottom: 10, // Space between each chat card
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tertiaryBlue,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  chatAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
    backgroundColor: COLORS.primaryBlue,
    borderWidth: 1, // Slight border for avatars
    borderColor: COLORS.accentLight,
  },
  chatTextContainer: {
    flex: 1,
  },
  chatTitle: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatSubtitle: {
    color: COLORS.darkGrey,
    fontSize: 13,
    marginTop: 2,
  },
  // Badges
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow badges to wrap to the next line
    justifyContent: 'flex-start', // Align badges to the start
    marginTop: 5,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBlue, // Changed badge background to a primary blue
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20, // More rounded for a "badge" look
    marginRight: 8, // Space between badges
    marginBottom: 8, // Space below badges when wrapping
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeTitle: {
    color: COLORS.textPrimary, // White text for badges
    fontSize: 14,
    fontWeight: 'bold',
  },
});