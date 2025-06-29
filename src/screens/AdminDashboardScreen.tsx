import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Image, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PROFESSIONAL_TYPES, MILITARY_BRANCHES } from '../lib/constants';

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

const getProfessionalTypeLabel = (value: string | null) => {
  const profType = PROFESSIONAL_TYPES.find(type => type.value === value);
  return profType ? profType.label : 'Not Set';
};

const getMilitaryBranchLabel = (value: string | null) => {
  const branch = MILITARY_BRANCHES.find(b => b.value === value);
  return branch ? branch.label : 'Not Set';
};

const VerificationLine = ({ label, value, isVerified, onVerify, onUnverify, isUpdating }: { label: string, value: string | null, isVerified: boolean, onVerify: () => void, onUnverify: () => void, isUpdating: boolean }) => {
  if (!value || value === '') return null;

  const displayValue = label === 'Military' ? getMilitaryBranchLabel(value) :
                       label === 'Professional' ? getProfessionalTypeLabel(value) :
                       value;

  return (
    <View style={styles.verificationRow}>
      <Text style={styles.verificationLabel}>{label}: <Text style={styles.verificationValue}>{displayValue}</Text></Text>
      {isVerified ? (
        <TouchableOpacity style={[styles.verifyButton, styles.unverifyButton]} onPress={onUnverify} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator size="small" color={COLORS.textPrimary}/> : <Text style={styles.verifyButtonText}>Unverify</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.verifyButton, styles.verifiedButton]} onPress={onVerify} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator size="small" color={COLORS.textPrimary}/> : <Text style={styles.verifyButtonText}>Verify</Text>}
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
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);
  const currentUser = useStore((state) => state.profile);

  const fetchProfiles = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
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
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();

    const profilesChannel = supabase.channel('admin-dashboard-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
            console.log('Profile change detected, refetching admin profiles:', payload);
            fetchProfiles();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(profilesChannel);
    };
  }, [currentUser]);

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
      fetchProfiles();
    } catch (error: any) {
      Alert.alert('Error', `Could not update role. ${error.message}`);
      console.error('Error setting role:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSetVerification = async (profileId: string, type: 'professional' | 'military', status: boolean) => {
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
          fetchProfiles();
      } catch (error: any) {
          Alert.alert('Error', `Could not set verification status. ${error.message}`);
          console.error('Error setting verification:', error);
      } finally {
          setIsUpdating(null);
      }
  };

  const handleViewProfile = (userId: string) => {
    navigation.navigate('MainApp', {
      screen: 'Profile',
      params: { userId: userId },
    });
  };

  const handleAwardBadge = async (profileId: string) => {
    if (!currentUser?.id || !['admin', 'super_admin'].includes(currentUser.role)) {
      Alert.alert('Permission Denied', 'Only admins and super admins can award badges.');
      return;
    }

    setIsUpdating(`badge-${profileId}`);
    try {
      const { error } = await supabase.functions.invoke('award-admin-badge', {
        body: { user_id: profileId, badge_id: selectedBadgeId || 8 }, // Default to Hero (8) if not selected
      });
      if (error) throw error;
      Alert.alert('Success', 'Badge awarded successfully.');
      fetchProfiles(); // Refresh to reflect changes if needed
    } catch (error: any) {
      Alert.alert('Error', 'Failed to award badge: ' + error.message);
    } finally {
      setIsUpdating(null);
      setSelectedBadgeId(null); // Reset selection
    }
  };

  const fetchBadges = async () => {
    const { data, error } = await supabase.from('badges').select('id, name');
    if (error) throw error;
    return data || [];
  };

  const renderProfileItem = ({ item }: { item: Profile }) => {
    const [badgeModalVisible, setBadgeModalVisible] = useState(false);
    const [localBadges, setLocalBadges] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
      fetchBadges().then(setLocalBadges).catch(console.error);
    }, []);

    return (
      <TouchableOpacity
        onPress={() => handleViewProfile(item.id)}
        style={styles.userCard}
      >
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${item.username?.charAt(0).toUpperCase() || 'U'}` }}
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
          {['admin', 'super_admin'].includes(currentUser?.role) && (
            <View style={styles.verificationRow}>
              <Text style={styles.verificationLabel}>Award Badge:</Text>
              <TouchableOpacity
                style={[styles.verifyButton, styles.awardButton]}
                onPress={() => setBadgeModalVisible(true)}
                disabled={isUpdating === `badge-${item.id}`}
              >
                {isUpdating === `badge-${item.id}` ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.verifyButtonText}>Award</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={badgeModalVisible}
          onRequestClose={() => setBadgeModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Award Badge to @{item.username}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedBadgeId}
                  onValueChange={(itemValue) => setSelectedBadgeId(itemValue)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item key="default" label="Select a badge..." value={null} />
                  {localBadges.map((badge) => (
                    <Picker.Item key={badge.id} label={badge.name} value={badge.id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[styles.modalButton, isUpdating === `badge-${item.id}` && styles.modalButtonDisabled]}
                onPress={() => { handleAwardBadge(item.id); setBadgeModalVisible(false); }}
                disabled={isUpdating === `badge-${item.id}` || !selectedBadgeId}
              >
                {isUpdating === `badge-${item.id}` ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.modalButtonText}>Confirm Award</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </TouchableOpacity>
    );
  };

  const getRoleColor = (role: Profile['role']) => {
    switch(role) {
      case 'super_admin': return COLORS.danger;
      case 'admin': return COLORS.warning;
      case 'moderator': return COLORS.primary;
      default: return COLORS.disabled;
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.errorText}>Loading user data...</Text>
      </SafeAreaView>
    );
  }

  const isAdminOrSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  if (!isAdminOrSuperAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.errorText}>Access denied. Only admins and super admins can view this dashboard.</Text>
        </ScrollView>
      </SafeAreaView>
    );
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
            <TouchableOpacity style={[styles.modalButton, isUpdating && styles.modalButtonDisabled]} onPress={handleSetRole} disabled={!!isUpdating}>
              {isUpdating ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.modalButtonText}>Confirm Change</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity
          style={styles.reportsButton}
          onPress={() => navigation.navigate('ReportsHub')}
        >
          <Ionicons name="flag-outline" size={24} color={COLORS.textPrimary} />
          <Text style={styles.reportsButtonText}>Reports</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.textPrimary} style={{ flex: 1 }} />
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
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  backButton: {
    padding: 10,
  },
  reportsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, padding: 10, borderRadius: 8 },
  reportsButtonText: { color: COLORS.textPrimary, fontSize: 16, marginLeft: 5 },
  listContainer: { paddingVertical: 10 },
  userCard: { backgroundColor: COLORS.tertiary, padding: 15, marginHorizontal: 15, marginVertical: 8, borderRadius: 12, },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: COLORS.primary },
  userInfo: { flex: 1, },
  username: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', },
  fullName: { color: COLORS.textSecondary, fontSize: 14, },
  roleContainer: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, },
  roleText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: 'bold', },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary, fontSize: 16, },
  verificationContainer: { marginTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, },
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, },
  verificationLabel: { color: COLORS.textSecondary, fontSize: 14, },
  verificationValue: { color: COLORS.textPrimary, fontWeight: 'bold', },
  verifyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, minWidth: 80, justifyContent: 'center' },
  awardButton: { backgroundColor: COLORS.info },
  verifiedButton: { backgroundColor: COLORS.success, },
  unverifyButton: { backgroundColor: COLORS.danger, },
  verifyButtonText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: 'bold', marginLeft: 5, },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalView: { width: '90%', backgroundColor: COLORS.secondary, borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  pickerContainer: { width: '100%', backgroundColor: COLORS.tertiary, borderRadius: 10, marginBottom: 20 },
  picker: { color: COLORS.textPrimary },
  pickerItem: { color: COLORS.textPrimary, backgroundColor: COLORS.tertiary },
  modalButton: { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%' },
  modalButtonDisabled: { backgroundColor: COLORS.disabled },
  modalButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  modalCancel: { color: COLORS.primary, fontSize: 16, marginTop: 20 },
});