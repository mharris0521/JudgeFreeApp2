import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import { COLORS } from '../lib/constants';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

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
  // NEW: Add a field to indicate unread status
  has_unread_messages?: boolean; // This field needs to come from your RPC/DB
}

export default function MyChatsScreen({ navigation }: { navigation: any }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useStore((state) => state.profile);
  const isFocused = useIsFocused();

  const fetchConversations = useCallback(async () => {
    if (!profile) {
        setLoading(false);
        return;
    }
    console.log("Fetching conversations for profile:", profile.id);
    setLoading(true);
    try {
      // Assuming get_user_channels_with_details now returns 'has_unread_messages'
      // You'll need to update your Supabase RPC to include this logic.
      const { data, error } = await supabase.rpc('get_user_channels_with_details', { p_user_id: profile.id });

      if (error) throw error;

      setConversations(data || []);

    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      Alert.alert("Error", "Could not load your conversations. " + error.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (isFocused) {
      fetchConversations();
    }
  }, [isFocused, fetchConversations]);

  useEffect(() => {
    if (!profile?.id) return;

    const channelSubscription = supabase.channel(`my-chats-${profile.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `participant_ids@>{${profile.id}}`
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
          // A more robust real-time unread count would involve a dedicated unread_status table
          // or listening to 'messages' table with a complex filter to avoid over-fetching
          // For now, any message insert triggers a refetch which updates the unread status via RPC.
        },
        (payload) => {
          console.log('New message detected, refetching conversations:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [profile, fetchConversations]);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) {
      console.error("Error parsing timestamp:", timestamp, e);
      return '';
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.has_unread_messages && styles.unreadCard // Apply unread style if applicable
      ]}
      onPress={() => navigation.navigate('CrisisChat', { channel_id: item.channel_id })}
    >
      <Image
        source={{ uri: item.other_participant?.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${item.other_participant?.username?.charAt(0).toUpperCase() || 'U'}` }}
        style={styles.avatar}
      />
      <View style={styles.cardTextContainer}>
        <Text style={styles.username}>{item.other_participant?.username || 'Chat'}</Text>
        <View style={styles.lastMessageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.content || 'No messages yet.'}
          </Text>
          {item.last_message?.created_at && (
            <Text style={styles.timestamp}>{formatTimestamp(item.last_message.created_at)}</Text>
          )}
        </View>
      </View>
      {item.has_unread_messages && (
        <View style={styles.unreadDot} /> // Unread indicator dot
      )}
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.textPrimary} style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.channel_id.toString()}
          onRefresh={fetchConversations}
          refreshing={loading}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>You have no active conversations.</Text>
              <Text style={styles.emptySubtext}>When you connect with someone, your chat will appear here.</Text>
            </View>
          )}
          contentContainerStyle={conversations.length === 0 ? styles.emptyListContent : styles.flatListContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBlue,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'right',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.tertiaryBlue,
    marginHorizontal: 15,
    borderRadius: 12,
    minHeight: 200,
  },
  emptyText: {
    color: COLORS.textDark,
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.darkGrey,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  flatListContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tertiaryBlue,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  // NEW: Style for unread conversations
  unreadCard: {
    backgroundColor: COLORS.accentLight, // A slightly different background for unread
    borderLeftWidth: 5, // A left border indicator
    borderColor: COLORS.primaryBlue, // Color of the left border
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: COLORS.primaryBlue,
    borderWidth: 1,
    borderColor: COLORS.accentLight,
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 5,
  },
  lastMessage: {
    flexShrink: 1,
    fontSize: 15,
    color: COLORS.darkGrey,
    marginRight: 10,
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  // NEW: Style for the unread dot indicator
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger, // A vibrant color for the unread dot
    marginLeft: 10, // Space between text and dot
    marginRight: 5, // Space between dot and arrow
  },
});