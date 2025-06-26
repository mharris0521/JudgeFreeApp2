// This screen serves as a confirmation and context-gathering step
// after a user presses the main Panic Button.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';

export default function AlertDetailsScreen({ navigation }: { navigation: any }) {
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmAlert = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('alert-manager', {
            body: { 
                action: 'create', 
                payload: { initial_message: initialMessage.trim() || 'A community member has activated a crisis alert.' } 
            }
        });
        if (error) throw error;
        // On success, close this modal and navigate to the Response Inbox
        navigation.replace('ResponseInbox', { alert_id: data.alert_id });
    } catch (error) {
        Alert.alert('Error', 'Could not activate your crisis alert. Please try again.');
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning-outline" size={32} color="#e74c3c" />
        <Text style={styles.headerTitle}>Crisis Alert Details</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>What's happening?</Text>
        <Text style={styles.subtitle}>
          You can add a brief, optional message so supporters have some context.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 'I'm feeling overwhelmed and need to talk.'"
          placeholderTextColor="#888"
          value={initialMessage}
          onChangeText={setInitialMessage}
          multiline
        />

        <View style={styles.disclaimerBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#f39c12" />
          <Text style={styles.disclaimerTitle}>Your Safety Matters</Text>
          <Text style={styles.disclaimerText}>
            Users on this platform are not vetted. Please exercise extreme caution and 
            <Text style={{fontWeight: 'bold'}}> never share personal identifying information</Text>
            . If you feel unsafe, end the conversation and report the user.
          </Text>
        </View>
        <View style={styles.disclaimerBox}>
            <Ionicons name="pulse-outline" size={24} color="#f39c12" />
            <Text style={styles.disclaimerTitle}>This is a real alert to real people.</Text>
            <Text style={styles.disclaimerText}>
                Only use this if you are experiencing an actual crisis. Please do not abuse your lifeline.
            </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.button, styles.confirmButton]} 
            onPress={handleConfirmAlert}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>Confirm & Activate Alert</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginLeft: 10 },
  content: { flex: 1, padding: 20 },
  prompt: { color: '#FFF', fontSize: 20, fontWeight: '600', marginBottom: 5 },
  subtitle: { color: '#AAA', fontSize: 16, marginBottom: 20 },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
  },
  disclaimerTitle: { color: '#f39c12', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  disclaimerText: { color: '#DDD', fontSize: 14, lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  button: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmButton: { backgroundColor: '#e74c3c' },
  cancelButton: { backgroundColor: 'transparent', marginTop: 10, borderWidth: 1, borderColor: '#555' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
