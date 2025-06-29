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
    backgroundColor: COLORS.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 10,
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
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.tertiary,
    borderRadius: 15,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 10,
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  timestamp: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  supportButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  supportButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});