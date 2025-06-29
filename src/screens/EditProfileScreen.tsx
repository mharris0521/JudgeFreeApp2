import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import ProfileForm from '../components/ProfileForm';
import { COLORS } from '../lib/constants';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen({ navigation }: { navigation: any }) {
  const route = useRoute();
  const params = route.params as { userId?: string };
  const targetUserId = params?.userId; // This is the ID of the profile to edit, if passed (for admin)

  const loggedInProfile = useStore((state) => state.profile);
  const setLoggedInProfile = useStore((state) => state.setProfile);

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Local state to control visibility of professional/military pickers for users
  const [showProfessionalPicker, setShowProfessionalPicker] = useState(false);
  const [showMilitaryPicker, setShowMilitaryPicker] = useState(false);

  // Profile data being edited. Initialize all relevant fields.
  const [formData, setFormData] = useState<Partial<Profile>>({
    username: '', full_name: '', bio: '', age: '', phone_number: '',
    city: '', state_region: '', profession: '', mood_status: '',
    professional_type: '', military_branch: '',
    professional_verified: false, // For admin to set, but initialize for all
    military_verified: false,     // For admin to set, but initialize for all
  });

  // Determine if the current context is an admin editing another user
  const isEditingAnotherUser = (
    targetUserId &&
    targetUserId !== loggedInProfile?.id &&
    loggedInProfile?.role &&
    ['admin', 'super_admin'].includes(loggedInProfile.role)
  );

  useEffect(() => {
    const loadProfile = async () => {
      let profileToEdit: any = null;
      // Determine which profile to load: current user's or a target user's (for admin)
      if (isEditingAnotherUser) {
        // Admin is editing ANOTHER user's profile
        setInitializing(true);
        const { data, error } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
        if (error) {
          Alert.alert("Error", "Could not load the user's profile to edit.");
          navigation.goBack();
          return;
        }
        profileToEdit = data;
      } else if (loggedInProfile) {
        // User is editing their OWN profile (or admin editing their own)
        profileToEdit = loggedInProfile;
      } else {
          // Fallback if not logged in and no target user (should be handled by auth flow)
          setInitializing(false);
          return;
      }

      if (profileToEdit) {
        setFormData({
          username: profileToEdit.username || '',
          full_name: profileToEdit.full_name || '',
          bio: profileToEdit.bio || '',
          age: profileToEdit.age?.toString() || '',
          phone_number: profileToEdit.phone_number || '',
          city: profileToEdit.city || '',
          state_region: profileToEdit.state_region || '',
          profession: profileToEdit.profession || '',
          mood_status: profileToEdit.mood_status || '',
          professional_type: profileToEdit.professional_type || '',
          military_branch: profileToEdit.military_branch || '',
          professional_verified: profileToEdit.professional_verified || false,
          military_verified: profileToEdit.military_verified || false,
        });

        // Initialize user-facing toggles based on existing data
        // If professional_type exists, user wants to show the picker
        setShowProfessionalPicker(!!profileToEdit.professional_type);
        // If military_branch exists, user wants to show the picker
        setShowMilitaryPicker(!!profileToEdit.military_branch);
      }
      setInitializing(false);
    };

    loadProfile();
  }, [targetUserId, loggedInProfile, navigation, isEditingAnotherUser]);


  const handleUpdate = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const onSaveChanges = async () => {
    setLoading(true);

    let updates: Partial<Profile> = {
      username: formData.username,
      full_name: formData.full_name,
      bio: formData.bio,
      phone_number: formData.phone_number,
      age: parseInt(formData.age as string, 10) || null,
      city: formData.city,
      state_region: formData.state_region,
      profession: formData.profession,
      mood_status: formData.mood_status,
      professional_type: formData.professional_type,
      military_branch: formData.military_branch,
    };

    try {
      // If an admin is editing ANOTHER user's profile
      if (isEditingAnotherUser) {
        console.log("Admin attempting to update ANOTHER user's profile via admin-manager.");
        updates.professional_verified = formData.professional_verified;
        updates.military_verified = formData.military_verified;

        const { error } = await supabase.functions.invoke('admin-manager', {
          body: { action: 'update_user_profile', payload: { target_user_id: targetUserId, updates: updates } },
        });
        if (error) throw new Error(error.message);
        Alert.alert("Success", "User profile has been updated by admin.");
      }
      // If any user (including admin) is editing THEIR OWN profile
      else if (loggedInProfile) {
        console.log("Updating OWN profile directly via Supabase client.");
        updates.professional_verified = formData.professional_verified;
        updates.military_verified = formData.military_verified;

        const { data: updatedProfile, error } = await supabase.from('profiles').update(updates).eq('id', loggedInProfile.id).select().single();
        if (error) throw error;
        setLoggedInProfile(updatedProfile as Profile);
        Alert.alert("Success", "Your profile has been updated.");
      } else {
        throw new Error("No profile to update or insufficient permissions.");
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error("Profile update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const title = isEditingAnotherUser ? `Editing @${formData.username}` : 'Edit Profile';

  if (initializing) {
      return (
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <ProfileForm
          initialData={formData}
          onChange={handleUpdate}
          isEditable={true}
          isAdmin={isEditingAnotherUser}
          fieldsToShow={[
            'username', 'full_name', 'phone_number', 'bio', 'age', 'city', 'state_region', 'profession', 'mood_status',
            // User-facing toggles (only for non-admin editing own profile)
            ...(!isEditingAnotherUser ? ['user_professional_toggle', 'user_military_toggle'] : []),
            // Pickers for designation (always shown if designated, or if admin is editing)
            'professional_type',
            'military_branch',
            // Admin-only toggles (only if admin is editing another user)
            ...(isEditingAnotherUser ? ['professional_verified', 'military_verified'] : [])
          ]}
          showProfessionalPicker={showProfessionalPicker}
          setShowProfessionalPicker={setShowProfessionalPicker}
          showMilitaryPicker={showMilitaryPicker}
          setShowMilitaryPicker={setShowMilitaryPicker}
        />
        <View style={styles.footer}>
            <TouchableOpacity style={styles.saveButton} onPress={onSaveChanges} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={[styles.buttonText, {color: COLORS.textSecondary}]}>Cancel</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.secondary },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
    footer: { padding: 20, marginTop: 20 },
    saveButton: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: 'transparent', paddingVertical: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.disabled },
    buttonText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
});
