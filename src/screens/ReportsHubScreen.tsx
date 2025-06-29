// src/screens/ReportsHubScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../lib/constants'; // Added COLORS import

interface Report {
  id: number;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  channel_id: number;
  category: string;
  comments: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  profiles_reporter: { username: string };
  profiles_reported: { username: string };
}

export default function ReportsHubScreen({ navigation }: { navigation: any }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState<string>('7');
  const [isActing, setIsActing] = useState(false);
  const profile = useStore((state) => state.profile);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            id, created_at, reporter_id, reported_user_id, channel_id, category, comments, status,
            profiles_reporter:reporter_id (username),
            profiles_reported:reported_user_id (username)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setReports(data || []);
      } catch (error: any) {
        Alert.alert("Error", `Could not fetch reports: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    const subscription = supabase
      .channel('reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleViewChat = async (channel_id: number) => {
    const { data: channelData, error } = await supabase
      .from('channels')
      .select('participant_ids')
      .eq('id', channel_id)
      .single();
    if (error) {
      Alert.alert("Error", `Could not load chat: ${error.message}`);
      return;
    }
    navigation.navigate('CrisisChat', { channel_id });
  };

  const handleSuspendUser = async () => {
    if (!selectedReport || !profile) return;
    setIsActing(true);
    try {
      const { error } = await supabase.functions.invoke('admin-manager', {
        body: {
          action: 'suspend_user',
          payload: {
            target_user_id: selectedReport.reported_user_id,
            report_id: selectedReport.id,
            suspension_reason: suspensionReason.trim() || 'Inappropriate behavior',
            suspension_duration_days: suspensionDays ? parseInt(suspensionDays) : null,
          },
        },
      });
      if (error) throw error;
      Alert.alert("Success", "User has been suspended and report resolved.");
      setModalVisible(false);
      setSuspensionReason('');
      setSuspensionDays('7');
    } catch (error: any) {
      Alert.alert("Error", `Could not suspend user: ${error.message}`);
    } finally {
      setIsActing(false);
    }
  };

  const handleMarkReviewed = async (report_id: number) => {
    setIsActing(true);
    try {
      const { error } = await supabase.from('reports').update({
        status: 'reviewed',
        handled_by: profile?.id,
        handled_at: new Date().toISOString(),
      }).eq('id', report_id);
      if (error) throw error;
      Alert.alert("Success", "Report marked as reviewed.");
    } catch (error: any) {
      Alert.alert("Error", `Could not update report: ${error.message}`);
    } finally {
      setIsActing(false);
    }
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCard}>
      <Text style={styles.reportHeader}>
        Report by @{item.profiles_reporter.username} against @{item.profiles_reported.username}
      </Text>
      <Text style={styles.reportDetail}>Category: {item.category}</Text>
      <Text style={styles.reportDetail}>Status: {item.status}</Text>
      <Text style={styles.reportDetail}>Date: {new Date(item.created_at).toLocaleString()}</Text>
      {item.comments && <Text style={styles.reportComments}>Comments: {item.comments}</Text>}
      <View style={styles.reportActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleViewChat(item.channel_id)}
        >
          <Text style={styles.actionButtonText}>View Chat</Text>
        </TouchableOpacity>
        {item.status !== 'resolved' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => {
                setSelectedReport(item);
                setModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Suspend User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => handleMarkReviewed(item.id)}
              disabled={isActing}
            >
              <Text style={styles.actionButtonText}>Mark Reviewed</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Suspend @{selectedReport?.profiles_reported.username}</Text>
            <Text style={styles.modalSubtitle}>Specify the reason and duration for suspension.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for suspension"
              placeholderTextColor={COLORS.textSecondary}
              value={suspensionReason}
              onChangeText={setSuspensionReason}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={suspensionDays}
                onValueChange={(val) => setSuspensionDays(val)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="7 Days" value="7" />
                <Picker.Item label="30 Days" value="30" />
                <Picker.Item label="Permanent" value="" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, isActing && styles.modalButtonDisabled]}
              onPress={handleSuspendUser}
              disabled={isActing}
            >
              {isActing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonText}>Confirm Suspension</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports Hub</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.textPrimary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No reports found.</Text>}
          contentContainerStyle={styles.listContainer}
          onRefresh={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1000); // Simulate refresh
          }}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  listContainer: { paddingVertical: 10 },
  reportCard: { backgroundColor: COLORS.tertiary, padding: 15, marginHorizontal: 15, marginVertical: 8, borderRadius: 12 },
  reportHeader: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  reportDetail: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 3 },
  reportComments: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5, fontStyle: 'italic' },
  reportActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  actionButton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 10, marginBottom: 5 },
  suspendButton: { backgroundColor: COLORS.danger },
  reviewButton: { backgroundColor: COLORS.warning },
  actionButtonText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary, fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalView: { width: '90%', backgroundColor: COLORS.tertiary, borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalInput: { width: '100%', backgroundColor: COLORS.secondary, borderRadius: 10, padding: 15, color: COLORS.textPrimary, fontSize: 16, marginBottom: 20 },
  pickerContainer: { width: '100%', backgroundColor: COLORS.secondary, borderRadius: 10, marginBottom: 20 },
  picker: { color: COLORS.textPrimary },
  pickerItem: { color: COLORS.textPrimary, backgroundColor: COLORS.secondary },
  modalButton: { backgroundColor: COLORS.danger, paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%' },
  modalButtonDisabled: { backgroundColor: COLORS.disabled },
  modalButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  modalCancel: { color: COLORS.primary, fontSize: 16, marginTop: 20 },
});
