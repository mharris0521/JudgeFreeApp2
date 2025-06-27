import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';

export default function ActiveAlertScreen({ navigation }: { navigation: any }) {
  const route = useRoute();
  const { alert_id } = route.params as { alert_id: number };
  const [loading, setLoading] = useState<string | null>(null);

  const handleResolve = async (outcome: 'good' | 'bad') => {
    setLoading(outcome);
    try {
      const { error } = await supabase.functions.invoke('alert-manager', {
        body: {
          action: 'resolve',
          payload: { alert_id, outcome },
        },
      });
      if (error) throw new Error(error.message);

      Alert.alert('Alert Resolved', 'Thank you for updating the status. Your alert is now closed.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', `Could not resolve your alert. ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
        const { error } = await supabase.functions.invoke('alert-manager', {
            body: { action: 'cancel', payload: { alert_id } },
        });
        if (error) throw new Error(error.message);

        Alert.alert('Alert Cancelled', 'Your alert has been cancelled and removed from the community board.');
        navigation.goBack();
    } catch(error: any) {
        Alert.alert('Error', `Could not cancel your alert. ${error.message}`);
    } finally {
        setLoading(null);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
            // Using a hosted image for the alarm icon for simplicity and to avoid local asset issues.
            // This is a placeholder and can be replaced with a local asset.
            source={{ uri: 'https://i.ibb.co/9vqyvB4/alarm-icon.png' }} 
            style={styles.headerImage}
            resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Crisis Alert Active</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.disclaimerBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#f39c12" />
          <Text style={styles.disclaimerTitle}>Your Safety Matters</Text>
          <Text style={styles.disclaimerText}>
            Users on this platform are not vetted. Please exercise extreme caution and 
            <Text style={{fontWeight: 'bold'}}> never share personal identifying information</Text>
            . If you feel unsafe, end the conversation and report the user.
          </Text>
        </View>

        <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Your alert is currently active</Text>
            <Text style={styles.infoText}>Supporters in the community have been notified and may be reaching out to you.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.button, styles.resolveGoodButton]} 
            onPress={() => handleResolve('good')}
            disabled={!!loading}
        >
            {loading === 'good' ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>I'm Getting Help - Resolve</Text>}
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.button, styles.resolveBadButton]} 
            onPress={() => handleResolve('bad')}
            disabled={!!loading}
        >
            {loading === 'bad' ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>I Still Need Help - Resolve</Text>}
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancel}
            disabled={!!loading}
        >
          {loading === 'cancel' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.cancelButtonText}>Cancel Alert</Text>}
        </TouchableOpacity>
        <Text style={styles.footerText}>Resolving or cancelling will stop new people from responding.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  headerImage: { width: 80, height: 80, marginBottom: 15 },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20 },
  disclaimerBox: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
  },
  disclaimerTitle: { color: '#f39c12', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  disclaimerText: { color: '#DDD', fontSize: 14, lineHeight: 20 },
  infoBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  infoText: { color: '#AAA', fontSize: 14, textAlign: 'center', marginTop: 8 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  button: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  resolveGoodButton: { backgroundColor: '#27ae60' }, // Green
  resolveBadButton: { backgroundColor: '#e67e22' }, // Orange
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555' },
  cancelButtonText: { color: '#e74c3c', fontSize: 18, fontWeight: 'bold' },
  footerText: { color: '#777', fontSize: 12, textAlign: 'center', marginTop: 10 },
});