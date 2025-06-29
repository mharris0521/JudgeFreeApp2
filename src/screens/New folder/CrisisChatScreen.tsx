import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import { Picker } from '@react-native-picker/picker';

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: string;
}

const REPORT_CATEGORIES = [
  { label: 'Harassment', value: 'harassment' },
  { label: 'Spam', value: 'spam' },
  { label: 'Inappropriate Content', value: 'inappropriate_content' },
  { label: 'Other', value: 'other' },
];


export default function CrisisChatScreen({ route, navigation }: { route: any, navigation: any }) {
  const { channel_id, alert_id } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null);
  const [isActivator, setIsActivator] = useState(false);
  const [associatedAlertId, setAssociatedAlertId] = useState<number | null>(alert_id || null);
  
  const profile = useStore((state) => state.profile);
  const flatListRef = useRef<FlatList>(null);

  // Reporting state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState(REPORT_CATEGORIES[0].value);
  const [reportComments, setReportComments] = useState('');
  const [isReporting, setIsReporting] = useState(false);


  useEffect(() => {
    const fetchInitialData = async () => {
      if (!channel_id || !profile) {
        Alert.alert("Error", "Missing chat details.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channel_id)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        const { data: channelData, error: channelError } = await supabase
          .from('channels')
          .select('participant_ids, alert_id, crisis_alerts:alert_id(created_by)')
          .eq('id', channel_id)
          .maybeSingle();
        
        if (channelError) throw channelError;
        
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
        Alert.alert("Error", "Could not load chat: " + error.message);
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
  }, [channel_id, profile, alert_id]); // Added alert_id to dependency array

  const handleSendMessage = async () => {
    if (newMessage.trim().length === 0 || !profile) return;
    const messageToSend = { channel_id: channel_id, sender_id: profile.id, content: newMessage.trim() };
    setNewMessage('');
    const { error } = await supabase.from('messages').insert(messageToSend);
    if (error) {
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

  const handleReportUser = async () => {
    if (!otherParticipant || !profile) return;
    setIsReporting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: profile.id,
        reported_user_id: otherParticipant.id,
        channel_id: channel_id,
        category: reportCategory,
        comments: reportComments.trim() || null,
      });
      if (error) throw error;
      Alert.alert("Report Submitted", "Thank you for reporting. Our team will review this issue.");
      setReportModalVisible(false);
      setReportCategory(REPORT_CATEGORIES[0].value);
      setReportComments('');
    } catch (error: any) {
      Alert.alert("Error", `Could not submit report: ${error.message}`);
    } finally {
      setIsReporting(false);
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Report User</Text>
            <Text style={modalStyles.modalSubtitle}>Please specify why you are reporting @{otherParticipant?.username}.</Text>
            <View style={modalStyles.pickerContainer}>
              <Picker
                selectedValue={reportCategory}
                onValueChange={(val) => setReportCategory(val)}
                style={modalStyles.picker}
                itemStyle={modalStyles.pickerItem}
              >
                {REPORT_CATEGORIES.map(cat => (
                  <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                ))}
              </Picker>
            </View>
            <TextInput
              style={modalStyles.input}
              placeholder="Additional details (optional)"
              placeholderTextColor="#888"
              value={reportComments}
              onChangeText={setReportComments}
              multiline
            />
            <TouchableOpacity
              style={[modalStyles.submitButton, isReporting && modalStyles.submitButtonDisabled]}
              onPress={handleReportUser}
              disabled={isReporting}
            >
              {isReporting ? <ActivityIndicator color="#FFF" /> : <Text style={modalStyles.submitButtonText}>Submit Report</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
              <Text style={modalStyles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat with {otherParticipant?.username || 'User'}</Text>
        <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.reportButton}>
          <Ionicons name="flag-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
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
  reportButton: { padding: 5, marginRight: 15 },
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

const modalStyles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { width: '90%', backgroundColor: '#2C2C2E', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#AAA', textAlign: 'center', marginBottom: 20 },
  pickerContainer: { width: '100%', backgroundColor: '#373737', borderRadius: 10, marginBottom: 20 },
  picker: { color: '#FFF' },
  pickerItem: { color: '#FFF', backgroundColor: '#373737' },
  input: { width: '100%', backgroundColor: '#373737', borderRadius: 10, padding: 15, minHeight: 100, color: '#FFF', fontSize: 16, textAlignVertical: 'top', marginBottom: 20 },
  submitButton: { backgroundColor: '#e74c3c', paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%' },
  submitButtonDisabled: { backgroundColor: '#c0392b' },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { color: '#3498db', fontSize: 16, marginTop: 20 },
});