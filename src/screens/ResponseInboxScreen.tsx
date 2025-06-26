import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';

interface ResponseOffer {
  id: number;
  offer_message: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null; } | null;
}

// --- NEW COMPONENT ---
// A non-intrusive banner to inform the user the alert is fulfilled.
const FulfilledAlertBanner = () => (
    <View style={styles.bannerContainer}>
        <Ionicons name="information-circle-outline" size={24} color="#FFF" />
        <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Alert Fulfilled</Text>
            <Text style={styles.bannerText}>
                This alert is no longer active on the community board. Please choose from the offers below to connect.
            </Text>
        </View>
    </View>
);

export default function ResponseInboxScreen({ route, navigation }: { route: any, navigation: any }) {
  const { alert_id } = route.params;
  const [offers, setOffers] = useState<ResponseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFulfilled, setIsFulfilled] = useState(false); // --- NEW STATE ---

  useEffect(() => {
    // This function now also fetches the initial status of the alert.
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch offers
        const { data: offersData, error: offersError } = await supabase
            .from('response_offers')
            .select(`id, offer_message, created_at, profiles ( username, avatar_url )`)
            .eq('alert_id', alert_id)
            .order('created_at', { ascending: true });
        if (offersError) throw offersError;
        setOffers(offersData || []);
        
        // Fetch initial alert status
        const { data: alertData, error: alertError } = await supabase
            .from('crisis_alerts')
            .select('status')
            .eq('id', alert_id)
            .single();
        if (alertError) throw alertError;
        if (alertData?.status === 'fulfilled') {
            setIsFulfilled(true);
        }

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();

    // Subscription for new offers coming in
    const offerSubscription = supabase.channel(`response-offers-${alert_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'response_offers', filter: `alert_id=eq.${alert_id}` },
        (payload) => {
            // Add the new offer to the list in real-time
            setOffers(currentOffers => [...currentOffers, payload.new as ResponseOffer]);
        }
      ).subscribe();

    // --- NEW SUBSCRIPTION for alert status changes ---
    const alertStatusSubscription = supabase.channel(`alert-status-${alert_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crisis_alerts', filter: `id=eq.${alert_id}`},
        (payload) => {
            if (payload.new.status === 'fulfilled') {
                setIsFulfilled(true);
            }
        }
      ).subscribe();

    return () => { 
      supabase.removeChannel(offerSubscription); 
      supabase.removeChannel(alertStatusSubscription);
    };
  }, [alert_id]);

  const handleAcceptOffer = async (offerId: number) => {
    setIsAccepting(offerId);
    try {
      const { data, error } = await supabase.functions.invoke('alert-manager', { body: { action: 'accept_offer', payload: { offer_id: offerId } } });
      if (error) throw new Error(error.message);
      navigation.replace('CrisisChat', { channel_id: data.channel_id, alert_id: alert_id });
    } catch (error: any) {
      Alert.alert("Error", `Could not connect. ${error.message}`);
    } finally {
      setIsAccepting(null);
    }
  };

  const handleCancelAlert = async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('alert-manager', {
        body: { action: 'cancel', payload: { alert_id: alert_id } }
      });
      if (error) throw new Error(error.message);
      Alert.alert("Alert Cancelled", "Your request for support has been successfully cancelled.");
      navigation.goBack(); 
    } catch (error: any) {
      Alert.alert("Error", `Could not cancel alert. ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const renderOfferItem = ({ item }: { item: ResponseOffer }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}><Image source={{ uri: item.profiles?.avatar_url || 'https://placehold.co/60x60/2C2C2E/FFF?text=JD' }} style={styles.avatar} /><Text style={styles.username}>{item.profiles?.username || 'Community Member'}</Text></View>
      <Text style={styles.messageText}>"{item.offer_message}"</Text>
      <TouchableOpacity style={[styles.acceptButton, isAccepting === item.id && styles.acceptButtonDisabled]} onPress={() => handleAcceptOffer(item.id)} disabled={isAccepting !== null}>
        {isAccepting === item.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.acceptButtonText}>Accept & Chat</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Conditionally render the new banner */}
      {isFulfilled && <FulfilledAlertBanner />}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Offers</Text>
        <Text style={styles.headerSubtitle}>Messages from community members will appear here. Choose one to talk to.</Text>
      </View>
      
      <FlatList
        data={offers}
        renderItem={renderOfferItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={() => !loading && (<View style={styles.emptyContainer}><ActivityIndicator size="small" color="#FFF" /><Text style={styles.emptyText}>Waiting for offers of support...</Text></View>)}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]} onPress={handleCancelAlert} disabled={isCancelling}>
          {isCancelling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.cancelButtonText}>Cancel Alert</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  bannerContainer: {
    backgroundColor: '#3498db',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 4,
  },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 16, color: '#AAA', textAlign: 'center', marginTop: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 20 },
  card: { backgroundColor: '#2C2C2E', borderRadius: 15, padding: 20, marginVertical: 8, marginHorizontal: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#1E1E1E' },
  username: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  messageText: { fontSize: 16, color: '#DDD', fontStyle: 'italic', lineHeight: 24 },
  acceptButton: { backgroundColor: '#3498db', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  acceptButtonDisabled: { backgroundColor: '#2980b9' },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  cancelButton: { backgroundColor: '#e74c3c', paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', height: 58 },
  cancelButtonDisabled: { backgroundColor: '#c0392b' },
  cancelButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});