// This file has been updated to use the new, unified 'alert-manager' Edge Function.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function ConnectingScreen({ route, navigation }: { route: any, navigation: any }) {
  const { channel_id } = route.params;
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let subscription: RealtimeChannel;

    const setupSubscription = () => {
      console.log(`Setting up real-time subscription for channel_id: ${channel_id}`);
      subscription = supabase
        .channel(`crisis-alert-connection-${channel_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'crisis_alerts',
            filter: `channel_id=eq.${channel_id}`,
          },
          (payload) => {
            console.log('Real-time update received for this alert:', payload);
            if (payload.new.status === 'acknowledged') {
              navigation.replace('CrisisChat', { channel_id: channel_id });
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("Subscription error:", err);
            Alert.alert("Connection Error", "Could not listen for real-time support updates.");
          }
        });
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [channel_id, navigation]);

  // --- UPDATED: This function now calls the unified 'alert-manager' ---
  const handleCancelAlert = async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('alert-manager', {
        body: {
          action: 'cancel', // Specify the action
          payload: { channel_id: channel_id }
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert("Alert Cancelled", "Your request for support has been cancelled.");
      navigation.popToTop();
    } catch (error: any) {
      console.error("Error cancelling alert:", error);
      Alert.alert("Error", `Could not cancel alert. ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Connecting...</Text>
        <Text style={styles.subtitle}>We are finding a support member for you.</Text>
        <ActivityIndicator size="large" color="#FFF" style={styles.spinner} />
        <Text style={styles.infoText}>You will be connected securely and privately.</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
            onPress={handleCancelAlert}
            disabled={isCancelling}
        >
             {isCancelling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.cancelButtonText}>Cancel Alert</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#AAA', textAlign: 'center', marginBottom: 40 },
  spinner: { marginVertical: 50 },
  infoText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  cancelButton: { backgroundColor: '#8e44ad', paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', height: 58 },
  cancelButtonDisabled: { backgroundColor: '#6c3483' },
  cancelButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
