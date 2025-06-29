// src/screens/CommunityAlertsScreen.tsx
// This screen lists active crisis alerts in the community.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../lib/constants';
import { useStore } from '../lib/store';

// Define the structure of an active alert
interface CrisisAlert {
  id: number;
  initial_message: string;
  created_at: string;
  status: 'active' | 'fulfilled' | 'resolved' | 'cancelled';
  created_by: string;
  profiles: { username: string; avatar_url: string | null; } | null;
}

export default function CommunityAlertsScreen({ navigation }: { navigation: any }) {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserProfile = useStore((state) => state.profile);

  const fetchActiveAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select(`
          id, initial_message, created_at, status, created_by,
          profiles:created_by (username, avatar_url)
        `)
        .eq('status', 'active') // Only fetch active alerts
        .neq('created_by', currentUserProfile?.id) // Don't show own alerts
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      Alert.alert("Error", `Could not fetch community alerts: ${error.message}`);
      console.error("Error fetching community alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserProfile]);

  useEffect(() => {
    fetchActiveAlerts();

    // Set up real-time subscription for new alerts or status changes
    const alertSubscription = supabase.channel('community-alerts-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_alerts' }, (payload) => {
        // If an alert is inserted, updated (e.g., status changed to active/fulfilled/resolved/cancelled)
        // or deleted, refetch the entire list to ensure consistency.
        console.log('Alert change detected, refetching:', payload);
        fetchActiveAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertSubscription);
    };
  }, [fetchActiveAlerts]);

  const handleOfferSupport = async (alertId: number, alertCreatorUsername: string) => {
    if (!currentUserProfile) {
      Alert.alert("Not Logged In", "Please log in to offer support.");
      return;
    }

    Alert.alert(
      "Offer Support",
      `Are you sure you want to offer support to @${alertCreatorUsername}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Offer Support",
          onPress: async () => {
            try {
              // Call the Supabase Edge Function to handle offering support
              const { data, error } = await supabase.functions.invoke('alert-manager', {
                body: {
                  action: 'send_offer', // <--- CHANGE THIS LINE
                  payload: {
                    alert_id: alertId,
                    // You might want to add a default message or prompt for one here
                    offer_message: 'I would like to offer my support.',
                  },
                },
              });

              if (error) throw new Error(error.message);

              Alert.alert("Offer Sent!", "Your offer has been sent to the alert creator. They will contact you if they accept.");
              // Optionally refresh the list or navigate away
              fetchActiveAlerts();

            } catch (error: any) {
              Alert.alert("Error", `Could not send offer: ${error.message}`);
              console.error("Error sending offer:", error);
            }
          },
        },
      ]
    );
  };

  const renderAlertItem = ({ item }: { item: CrisisAlert }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.profiles?.username?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{item.profiles?.username || 'Anonymous'}</Text>
          <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
      <Text style={styles.messageText}>"{item.initial_message || 'A community member has activated a crisis alert.'}"</Text>
      <TouchableOpacity
        style={styles.supportButton}
        onPress={() => handleOfferSupport(item.id, item.profiles?.username || 'Anonymous')}
      >
        <Text style={styles.supportButtonText}>Offer Support</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Alerts</Text>
        <Text style={styles.headerSubtitle}>Reach out and offer support to those in need.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.textPrimary} style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={60} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No active community alerts right now.</Text>
              <Text style={styles.emptySubtext}>Check back later or activate your own alert if you need support.</Text>
            </View>
          )}
          contentContainerStyle={alerts.length === 0 ? styles.listEmptyContent : styles.listContent}
          onRefresh={fetchActiveAlerts}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBlue, // Changed from COLORS.secondary
  },
  header: {
    paddingHorizontal: 15, // Adjusted to match HomeScreen
    paddingVertical: 15, // Adjusted to match HomeScreen
    alignItems: 'center', // Aligned to center
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border, // Changed from COLORS.border
    marginBottom: 20, // Added to match HomeScreen
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary, // Kept for consistency
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary, // Kept for consistency
    textAlign: 'center',
    marginTop: 5, // Adjusted to match HomeScreen
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 20, // Adjusted to match HomeScreen scroll content padding
    paddingHorizontal: 15, // Adjusted to match HomeScreen scroll content padding
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.tertiaryBlue, // Match card background
    marginHorizontal: 15, // Match card horizontal margin
    borderRadius: 12, // Match card border radius
    padding: 20, // Consistent padding
    minHeight: 200, // Ensure it has some height
  },
  emptyText: {
    color: COLORS.textDark, // Match card title text
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.darkGrey, // Match card subtitle text
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: COLORS.tertiaryBlue, // Changed from COLORS.tertiary
    borderRadius: 12, // Adjusted to match HomeScreen cards
    padding: 15, // Adjusted to match HomeScreen cards
    marginVertical: 8,
    marginHorizontal: 0, // Removed horizontal margin to use listContent padding
    shadowColor: '#000', // Added shadow properties
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 10, // Consistent spacing between cards
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: COLORS.primaryBlue, // Changed to primaryBlue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Added border
    borderColor: COLORS.accentLight, // Added border color
  },
  avatarText: {
    color: COLORS.textPrimary, // White text
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark, // Changed from COLORS.textPrimary for better contrast on light cards
  },
  timestamp: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.darkGrey, // Changed from COLORS.textSecondary for consistency with HomeScreen subtitles
    fontStyle: 'italic',
    lineHeight: 24,
  },
  supportButton: {
    backgroundColor: COLORS.primaryBlue, // Changed from COLORS.primary
    paddingVertical: 12, // Adjusted for slightly smaller buttons
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  supportButtonText: {
    color: COLORS.textPrimary, // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
});