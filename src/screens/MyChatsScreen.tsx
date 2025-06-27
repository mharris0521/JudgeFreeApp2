// src/screens/MyChatsScreen.tsx
// This screen has been updated to listen for real-time updates, ensuring
// new conversations appear automatically without needing a manual refresh.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';

// Define the structure of a conversation object
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

export default function MyChatsScreen({ navigation }: { navigation: any }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useStore((state) => state.profile);
  const isFocused = useIsFocused(); // Hook to know when the screen is focused

  // We use useCallback to memoize the fetch function so it's not recreated on every render
  const fetchConversations = useCallback(async () => {
    if (!profile) return;
    console.log("Fetching conversations...");
    setLoading(true);
    try {
      // This RPC function is more efficient and secure than doing a complex join on the client.
      const { data, error } = await supabase.rpc('get_user_channels_with_details', { p_user_id: profile.id });

      if (error) throw error;
      
      // The data from the RPC is already in the correct format.
      setConversations(data || []);

    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      Alert.alert("Error", "Could not load your conversations. " + error.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Fetch conversations when the screen is focused
  useEffect(() => {
    if (isFocused) {
      fetchConversations();
    }
  }, [isFocused, fetchConversations]);

  // --- NEW: Real-time Subscription ---
  // This useEffect sets up the subscription to listen for new channels or messages.
  useEffect(() => {
    if (!profile?.id) return;

    const channelSubscription = supabase.channel(`my-chats-${profile.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'channels', 
          filter: `participant_ids@>{${profile.id}}` // Listen for changes where user is a participant
        }, 
        (payload) => {
          console.log('Change detected in channels, refetching conversations:', payload);
          fetchConversations();
        }
      )
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // We can't filter by channel participants here directly, so we just refetch on any new message.
          // This is a reasonable trade-off for ensuring the 'last_message' is always up to date.
        },
        (payload) => {
          console.log('New message detected, refetching conversations:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    // Cleanup function to remove the subscription when the component unmounts
    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [profile, fetchConversations]);

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('CrisisChat', { channel_id: item.channel_id })}
    >
      <Image 
        source={{ uri: item.other_participant?.avatar_url || `https://placehold.co/60x60/2C2C2E/FFF?text=${item.other_participant?.username?.charAt(0).toUpperCase()}` }} 
        style={styles.avatar} 
      />
      <View style={styles.cardTextContainer}>
        <Text style={styles.username}>{item.other_participant?.username || 'Chat'}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message?.content || 'No messages yet.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Chats</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#FFF" style={{ flex: 1 }} /> : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.channel_id.toString()}
          onRefresh={fetchConversations} // Allow pull-to-refresh
          refreshing={loading}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#444" />
              <Text style={styles.emptyText}>You have no active conversations.</Text>
              <Text style={styles.emptySubtext}>When you connect with someone, your chat will appear here.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#AAA', fontSize: 18, marginTop: 20, fontWeight: 'bold' },
  emptySubtext: { color: '#777', fontSize: 16, marginTop: 10, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#333' },
  cardTextContainer: { flex: 1 },
  username: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  lastMessage: { fontSize: 16, color: '#AAA', marginTop: 5 },
});
