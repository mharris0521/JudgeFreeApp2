// src/screens/CrisisChatScreen.tsx
// This file has been corrected to use .maybeSingle() to prevent crashes when
// a chat channel is not associated with a crisis alert.

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: string;
}

export default function CrisisChatScreen({ route, navigation }: { route: any, navigation: any }) {
  const { channel_id } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null);
  
  const profile = useStore((state) => state.profile);
  const flatListRef = useRef<FlatList>(null);
  
  const [isActivator, setIsActivator] = useState(false);
  const [associatedAlertId, setAssociatedAlertId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!channel_id || !profile) return;
      setLoading(true);
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channel_id)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        // --- CORRECTED QUERY LOGIC ---
        // 1. Use .maybeSingle() to gracefully handle cases where no alert is linked (e.g., DMs).
        // This prevents the PGRST116 error.
        const { data: channelData, error: channelError } = await supabase
            .from('channels')
            .select('participant_ids, alert_id, crisis_alerts:alert_id(created_by)')
            .eq('id', channel_id)
            .maybeSingle(); // <-- THE CRITICAL FIX IS HERE
        if (channelError) throw channelError;
        
        // 2. Safely check if channelData and the nested crisis_alerts object exist before accessing them.
        if (channelData) {
            if (channelData.crisis_alerts && channelData.crisis_alerts.created_by === profile.id) {
                setIsActivator(true);
                setAssociatedAlertId(channelData.alert_id);
            }

            const otherParticipantId = channelData.participant_ids.find(id => id !== profile.id);
            if (otherParticipantId) {
              const { data: otherUserData, error: userError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherParticipantId)
                .single();
              if (userError) throw userError;
              setOtherParticipant(otherUserData);
            }
        }

      } catch (error: any) {
        console.error("Error fetching initial chat data:", error);
        Alert.alert("Error", "Could not load the chat details: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const subscription = supabase
      .channel(`crisis-chat-${channel_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channel_id}` },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel_id, profile]);

  const handleSendMessage = async () => {
    if (newMessage.trim().length === 0 || !profile) return;
    const messageToSend = { channel_id: channel_id, sender_id: profile.id, content: newMessage.trim() };
    setNewMessage(''); 
    const { error } = await supabase.from('messages').insert(messageToSend);
    if (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Message could not be sent.");
      setNewMessage(messageToSend.content);
    }
  };

  const handleEndChat = () => {
    if (isActivator && otherParticipant && associatedAlertId) {
      navigation.replace('LeaveFeedback', {
        alert_id: associatedAlertId,
        supporter_id: otherParticipant.id,
      });
    } else {
      navigation.goBack();
      if (!isActivator) {
          Alert.alert("Chat Ended", "The chat has been closed by the user.");
      }
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === profile?.id;
    return (
      <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
      return (<SafeAreaView style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat with {otherParticipant?.username || 'User'}</Text>
        <TouchableOpacity onPress={handleEndChat}>
          <Text style={styles.closeButton}>End Chat</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Ionicons name="send" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  closeButton: { fontSize: 16, color: '#e74c3c', fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 10, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginVertical: 5 },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { borderRadius: 20, padding: 15, maxWidth: '75%' },
  myMessageBubble: { backgroundColor: '#3498db', borderBottomRightRadius: 5 },
  theirMessageBubble: { backgroundColor: '#373737', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 16, color: '#FFF' },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: '#1E1E1E', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#373737', borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8, color: '#FFF', fontSize: 16 },
  sendButton: { marginLeft: 10, justifyContent: 'center', alignItems: 'center', padding: 5 },
});
