// This file has been completely refactored for the "Activator Choice Model".
// It is now the "Community Alerts" screen, where users can offer support.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

export interface CrisisAlert {
  id: number;
  created_at: string;
  initial_message: string | null;
  profiles: {
    username: string;
  } | null;
}

export default function CommunityAlertsScreen({ navigation }: { navigation: any }) {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the "Send Offer" modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);
  const [offerMessage, setOfferMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchInitialAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('crisis_alerts')
          .select(`id, created_at, initial_message, profiles:profiles!crisis_alerts_created_by_fkey(username)`)
          .eq('status', 'active');

        if (error) throw error;
        if (data) setAlerts(data);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        Alert.alert("Error", "Could not fetch community alerts.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialAlerts();
    const subscription = supabase.channel('crisis_alerts').on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_alerts' }, () => { fetchInitialAlerts(); }).subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const openOfferModal = (alert: CrisisAlert) => {
    setSelectedAlert(alert);
    setOfferMessage('');
    setModalVisible(true);
  };

  const handleSendOffer = async () => {
    if (!selectedAlert || offerMessage.trim().length === 0) return;
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('alert-manager', {
        body: {
          action: 'send_offer',
          payload: {
            alert_id: selectedAlert.id,
            offer_message: offerMessage.trim()
          }
        },
      });

      if (error) throw new Error(error.message);

      setModalVisible(false);
      Alert.alert("Offer Sent", "Your message of support has been sent to the user.");

    } catch (error: any) {
      console.error("Error sending offer:", error);
      Alert.alert("Error", `Could not send offer. ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const renderAlertItem = ({ item }: { item: CrisisAlert }) => (
    <View style={styles.alertItem}>
      <Text style={styles.alertUser}>A community member needs support</Text>
      <Text style={styles.alertTimestamp}>{new Date(item.created_at).toLocaleString()}</Text>
      <TouchableOpacity
        style={styles.offerButton}
        onPress={() => openOfferModal(item)}
      >
        <Text style={styles.offerButtonText}>Offer Support</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal for sending an offer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Send a Message of Support</Text>
            <Text style={styles.modalSubtitle}>Let them know you're here to listen. This is the first message they will see.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 'Hey, I'm here to listen if you need to talk.'"
              placeholderTextColor="#888"
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
            />
            <TouchableOpacity style={[styles.modalButton, isSending && styles.modalButtonDisabled]} onPress={handleSendOffer} disabled={isSending}>
              {isSending ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonText}>Send Offer</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Screen Content */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Alerts</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>Close</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 50 }} /> : <FlatList data={alerts} renderItem={renderAlertItem} keyExtractor={(item) => item.id.toString()} ListEmptyComponent={() => (<View style={styles.emptyContainer}><Text style={styles.emptyText}>No active alerts right now.</Text></View>)} contentContainerStyle={styles.listContainer} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  closeButton: { fontSize: 16, color: '#3498db' },
  listContainer: { padding: 10 },
  alertItem: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 20, marginBottom: 15 },
  alertUser: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  alertTimestamp: { fontSize: 12, color: '#888', marginTop: 5 },
  emptyContainer: { flex: 1, marginTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#AAA' },
  offerButton: { backgroundColor: '#27ae60', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  offerButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { width: '90%', backgroundColor: '#2C2C2E', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#AAA', textAlign: 'center', marginBottom: 20 },
  modalInput: { width: '100%', backgroundColor: '#1E1E1E', borderRadius: 10, padding: 15, minHeight: 100, color: '#FFF', fontSize: 16, textAlignVertical: 'top' },
  modalButton: { backgroundColor: '#3498db', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, width: '100%' },
  modalButtonDisabled: { backgroundColor: '#2980b9' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalCancel: { color: '#e74c3c', fontSize: 16, marginTop: 20 },
});
