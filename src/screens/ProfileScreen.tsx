import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';
// Note: This assumes you have a BadgeComponents file. If not, comment out BadgeDisplay.
import { BadgeDisplay } from '../components/BadgeComponents'; 
import { Ionicons } from '@expo/vector-icons';

type FullProfile = {
  id: string;
  username: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  is_available_for_support: boolean;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
  state_region: string | null;
  profession: string | null;
  full_name: string | null;
  phone_number: string | null;
  email?: string | null;
};

const InfoRow = ({ label, value, icon, isPrivate = false }: { label: string, value: string | number | null | undefined, icon: any, isPrivate?: boolean }) => (
    <View style={styles.infoRow}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name={icon} size={20} color={isPrivate ? "#c0392b" : "#95a5a6"} style={{marginRight: 15}}/>
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not Set'}</Text>
            </View>
        </View>
    </View>
);

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const isFocused = useIsFocused();
  const params = route.params as { userId?: string };
  const viewUserId = params?.userId;

  const loggedInProfile = useStore((state) => state.profile);
  const session = useStore((state) => state.session);
  const setProfile = useStore((state) => state.setProfile);
  
  const [profileToDisplay, setProfileToDisplay] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [awardedBadges, setAwardedBadges] = useState<any[]>([]);

  const isOwnProfile = !viewUserId || viewUserId === loggedInProfile?.id;
  
  useEffect(() => {
    const fetchProfileData = async (id: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        setProfileToDisplay(data);

        const { data: badgeData, error: badgeError } = await supabase.from('user_badges').select(`badges ( id, name )`).eq('user_id', id);
        if (badgeError) throw badgeError;
        setAwardedBadges(badgeData?.map(item => item.badges).filter(Boolean) || []);
      } catch (error: any) {
        Alert.alert("Error", "Could not fetch this user's profile.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    // We use isFocused to re-trigger the effect when navigating back to the screen
    if (isFocused) {
        if (viewUserId) {
            fetchProfileData(viewUserId);
        } else {
            if (loggedInProfile) {
                setProfileToDisplay({ ...loggedInProfile, email: session?.user?.email });
            }
        }
    }
  }, [viewUserId, loggedInProfile, session, navigation, isFocused]);

  const handleAvailabilityChange = async (newValue: boolean) => { 
      if (!profileToDisplay) return; 
      const originalValue = profileToDisplay.is_available_for_support;
      const updatedProfile = { ...profileToDisplay, is_available_for_support: newValue };
      setProfileToDisplay(updatedProfile);
      if(isOwnProfile && loggedInProfile) setProfile(updatedProfile as any);

      const { error } = await supabase.from('profiles').update({ is_available_for_support: newValue }).eq('id', profileToDisplay.id); 
      if (error) { 
          Alert.alert("Error", "Could not update status.");
          const revertedProfile = { ...profileToDisplay, is_available_for_support: originalValue };
          setProfileToDisplay(revertedProfile);
          if(isOwnProfile && loggedInProfile) setProfile(revertedProfile as any);
      } 
  };
  
  const handleLogout = async () => { setLoading(true); await supabase.auth.signOut(); setLoading(false); };

  if (loading || !profileToDisplay) {
    return ( <SafeAreaView style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#FFF" /></SafeAreaView> );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isOwnProfile && (
        <View style={styles.adminHeader}>
          {/* UPDATED: Back button now navigates explicitly */}
          <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.adminHeaderText}>Viewing Profile</Text>
          <View style={{width: 40}} />{/* Spacer */}
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: profileToDisplay.avatar_url || `https://placehold.co/120x120/2C2C2E/FFF?text=${profileToDisplay.username?.charAt(0).toUpperCase()}` }} style={styles.avatar}/>
          <Text style={styles.username}>@{profileToDisplay.username} {profileToDisplay.age ? `(${profileToDisplay.age})` : ''}</Text>
          <Text style={styles.bio}>{profileToDisplay.bio || "No bio set."}</Text>
        </View>
        
        <BadgeDisplay profile={profileToDisplay} awardedBadges={awardedBadges} />

        <View style={styles.infoContainer}>
            <Text style={styles.sectionTitle}>Public Information</Text>
            <InfoRow label="Location" value={profileToDisplay.city && profileToDisplay.state_region ? `${profileToDisplay.city}, ${profileToDisplay.state_region}` : null} icon="location-outline" />
            <InfoRow label="Profession" value={profileToDisplay.profession} icon="briefcase-outline" />
        </View>

        <View style={[styles.infoContainer, styles.privateInfoContainer]}>
            <Text style={[styles.sectionTitle, {color: "#c0392b"}]}>Private Information</Text>
            <InfoRow label="Full Name" value={profileToDisplay.full_name} icon="person-circle-outline" isPrivate />
            {isOwnProfile && <InfoRow label="Email" value={profileToDisplay.email || session?.user?.email} icon="mail-outline" isPrivate />}
            <InfoRow label="Phone Number" value={profileToDisplay.phone_number} icon="call-outline" isPrivate />
        </View>

        {isOwnProfile ? (
            <>
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')}><Ionicons name="pencil-outline" size={16} color="#FFF" /><Text style={styles.editProfileButtonText}>Edit Profile</Text></TouchableOpacity>
                
                {['admin', 'super_admin'].includes(profileToDisplay.role) && (
                    <TouchableOpacity style={styles.adminToolsButton} onPress={() => navigation.navigate('AdminDashboard')}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#FFF" />
                      <Text style={styles.adminToolsButtonText}>Admin Tools</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.controlRow}><Text style={styles.controlText}>Available to Support Others</Text><Switch trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={profileToDisplay.is_available_for_support ? "#3498db" : "#f4f3f4"} onValueChange={handleAvailabilityChange} value={profileToDisplay.is_available_for_support}/></View>
            </View>

            <View style={styles.footer}><TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>{loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.logoutButtonText}>Logout</Text>}</TouchableOpacity></View>
            </>
        ) : (
            <View style={styles.adminControlsContainer}>
                <Text style={styles.viewingNoticeText}>You are viewing this profile as an administrator.</Text>
                <TouchableOpacity 
                  style={styles.adminEditButton} 
                  onPress={() => navigation.navigate('EditProfile', { userId: profileToDisplay.id })}
                >
                  <Ionicons name="pencil-outline" size={16} color="#FFF" />
                  <Text style={styles.adminToolsButtonText}>Edit User Profile</Text>
                </TouchableOpacity>
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  adminHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  backButton: { padding: 5 },
  adminHeaderText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  profileHeader: { alignItems: 'center', padding: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#2C2C2E', marginBottom: 15, borderWidth: 2, borderColor: '#3498db' },
  username: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  bio: { color: '#AAA', fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  infoContainer: { marginTop: 20, marginHorizontal: 15, backgroundColor: '#2C2C2E', borderRadius: 15, padding: 15 },
  privateInfoContainer: { borderColor: 'rgba(192, 57, 43, 0.5)', borderWidth: 1 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#444' },
  infoRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#444' },
  infoLabel: { color: '#AAA', fontSize: 12, textTransform: 'uppercase' },
  infoValue: { color: '#FFF', fontSize: 16, fontWeight: '500', marginTop: 2 },
  controlsContainer: { padding: 20, marginTop: 20, borderTopWidth: 1, borderTopColor: '#333' },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3498db', paddingVertical: 15, borderRadius: 12, marginBottom: 20 },
  editProfileButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  adminToolsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8e44ad', paddingVertical: 15, borderRadius: 12, marginBottom: 20 },
  adminToolsButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15 },
  controlText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  footer: { padding: 20, marginTop: 20 },
  logoutButton: { backgroundColor: '#333', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  logoutButtonText: { color: '#e74c3c', fontSize: 18, fontWeight: 'bold' },
  adminControlsContainer: { margin: 20, padding: 15, backgroundColor: 'rgba(142, 68, 173, 0.2)', borderRadius: 10, borderWidth: 1, borderColor: '#8e44ad', alignItems: 'center' },
  viewingNoticeText: { color: '#FFF', textAlign: 'center', fontStyle: 'italic', marginBottom: 15 },
  adminEditButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e67e22', paddingVertical: 15, borderRadius: 12, width: '100%' },
});