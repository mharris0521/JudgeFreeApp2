// src/screens/AdminDashboardScreen.tsx
// This file has been updated with the correct nested navigation call.
// All other code remains the same.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Image, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';
import { Ionicons } from '@expo/vector-icons';

type Profile = {
  id: string;
  username: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  avatar_url: string | null;
  full_name: string | null;
  professional_type: string | null;
  professional_verified: boolean;
  military_branch: string | null;
  military_verified: boolean;
};

const assignableRoles: Profile['role'][] = ['user', 'moderator', 'admin', 'super_admin'];

const VerificationLine = ({ label, value, isVerified, onVerify, onUnverify, isUpdating }: { label: string, value: string | null, isVerified: boolean, onVerify: () => void, onUnverify: () => void, isUpdating: boolean }) => {
  if (!value) return null;

  return (
    <View style={styles.verificationRow}>
      <Text style={styles.verificationLabel}>{label}: <Text style={styles.verificationValue}>{value}</Text></Text>
      {isVerified ? (
        <TouchableOpacity style={[styles.verifyButton, styles.unverifyButton]} onPress={onUnverify} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={styles.verifyButtonText}>Unverify</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.verifyButton, styles.unverifiedButton]} onPress={onVerify} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={styles.verifyButtonText}>Verify</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function AdminDashboardScreen({ navigation }: { navigation: any }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Profile['role']>('user');
  const currentUser = useStore((state) => state.profile);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, avatar_url, full_name, professional_type, professional_verified, military_branch, military_verified')
        .order('role', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'Could not fetch user profiles. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);
  
  const openRoleModal = (profile: Profile) => {
    if (currentUser?.role !== 'super_admin' || profile.id === currentUser?.id) {
        Alert.alert("Permission Denied", "You do not have permission to change this user's role.");
        return;
    }
    setSelectedProfile(profile);
    setSelectedRole(profile.role);
    setModalVisible(true);
  };

  const handleSetRole = async () => {
    if (!selectedProfile) return;
    setIsUpdating(selectedProfile.id);
    try {
      const { error } = await supabase.functions.invoke('admin-manager', {
        body: {
          action: 'set_role',
          payload: {
            target_user_id: selectedProfile.id,
            new_role: selectedRole,
          },
        },
      });

      if (error) throw new Error(error.message);
      Alert.alert('Success', `${selectedProfile.username}'s role has been updated.`);
      setModalVisible(false);
      fetchProfiles(); // Refresh list
    } catch (error: any) {
      Alert.alert('Error', `Could not update role. ${error.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSetVerification = async (profileId: string, type: 'professional' | 'military', status: boolean) => {
      const action = status ? 'Verifying' : 'Un-verifying';
      setIsUpdating(`${type}-${profileId}`);
      try {
          const { error } = await supabase.functions.invoke('admin-manager', {
            body: {
              action: 'set_verification_status',
              payload: {
                target_user_id: profileId,
                type: type,
                status: status,
              },
            },
          });
          if (error) throw new Error(error.message);

          Alert.alert('Success', `The user's ${type} designation has been ${status ? 'verified' : 'un-verified'}.`);
          fetchProfiles(); // Refresh the list to show the change
      } catch (error: any) {
          Alert.alert('Error', `Could not set verification status. ${error.message}`);
      } finally {
          setIsUpdating(null);
      }
  };

  // --- THIS IS THE FIX ---
  const handleViewProfile = (userId: string) => {
    // Navigate to the 'MainApp' (the Tab Navigator) and then to the 'Profile' screen within it.
    navigation.navigate('MainApp', {
      screen: 'Profile',
      params: { userId: userId },
    });
  };

  const renderProfileItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
        disabled={currentUser?.role !== 'super_admin'}
        onPress={() => handleViewProfile(item.id)}
    >
        <View style={styles.userCard}>
            <View style={styles.cardHeader}>
                <Image 
                    source={{ uri: item.avatar_url || `https://placehold.co/60x60/333/FFF?text=${item.username?.charAt(0).toUpperCase()}` }} 
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.username}>@{item.username}</Text>
                    <Text style={styles.fullName}>{item.full_name || 'No full name'}</Text>
                </View>
                <TouchableOpacity onPress={() => openRoleModal(item)} disabled={currentUser?.role !== 'super_admin' || item.id === currentUser?.id}>
                    <View style={[styles.roleContainer, {backgroundColor: getRoleColor(item.role)}]}>
                        <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.verificationContainer}>
                <VerificationLine 
                    label="Military" 
                    value={item.military_branch} 
                    isVerified={item.military_verified} 
                    onVerify={() => handleSetVerification(item.id, 'military', true)}
                    onUnverify={() => handleSetVerification(item.id, 'military', false)}
                    isUpdating={isUpdating === `military-${item.id}`}
                />
                <VerificationLine 
                    label="Professional" 
                    value={item.professional_type} 
                    isVerified={item.professional_verified} 
                    onVerify={() => handleSetVerification(item.id, 'professional', true)}
                    onUnverify={() => handleSetVerification(item.id, 'professional', false)}
                    isUpdating={isUpdating === `professional-${item.id}`}
                />
            </View>
        </View>
    </TouchableOpacity>
  );

  const getRoleColor = (role: Profile['role']) => {
      switch(role) {
          case 'super_admin': return '#e74c3c';
          case 'admin': return '#e67e22';
          case 'moderator': return '#3498db';
          default: return '#95a5a6';
      }
  }

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
                    <Text style={styles.modalTitle}>Change Role for @{selectedProfile?.username}</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedRole}
                            onValueChange={(itemValue) => setSelectedRole(itemValue)}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                        >
                            {assignableRoles.map(role => <Picker.Item key={role} label={role.toUpperCase()} value={role} />)}
                        </Picker>
                    </View>
                    <TouchableOpacity style={styles.modalButton} onPress={handleSetRole} disabled={!!isUpdating}>
                        {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonText}>Confirm Change</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FFF" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
          onRefresh={fetchProfiles}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  listContainer: { paddingVertical: 10 },
  userCard: { backgroundColor: '#2C2C2E', padding: 15, marginHorizontal: 15, marginVertical: 8, borderRadius: 12, },
  cardHeader: { flexDirection: 'row', alignItems: 'center', },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, },
  userInfo: { flex: 1, },
  username: { color: '#FFF', fontSize: 16, fontWeight: 'bold', },
  fullName: { color: '#AAA', fontSize: 14, },
  roleContainer: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, },
  roleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#AAA', fontSize: 16, },
  verificationContainer: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 10, },
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, },
  verificationLabel: { color: '#AAA', fontSize: 14, },
  verificationValue: { color: '#FFF', fontWeight: 'bold', },
  verifyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, minWidth: 80, justifyContent: 'center' },
  unverifiedButton: { backgroundColor: '#3498db', },
  unverifyButton: { backgroundColor: '#e74c3c', },
  verifyButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5, },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalView: { width: '90%', backgroundColor: '#2C2C2E', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  pickerContainer: { width: '100%', backgroundColor: '#333', borderRadius: 10, marginBottom: 20 },
  picker: { color: '#FFF' },
  pickerItem: { color: '#FFF', backgroundColor: '#333' },
  modalButton: { backgroundColor: '#e67e22', paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalCancel: { color: '#95a5a6', fontSize: 16, marginTop: 20 },
});
