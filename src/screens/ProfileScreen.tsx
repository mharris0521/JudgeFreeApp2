import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useStore, Profile } from '../lib/store';
import ProfileForm from '../components/ProfileForm';
import { VerificationBadgeDisplay, AwardBadgeDisplay } from '../components/BadgeComponents';
import { COLORS } from '../lib/constants';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const session = useStore((state) => state.session);
  const loggedInProfile = useStore((state) => state.profile);
  const setLoggedInProfile = useStore((state) => state.setProfile);
  const [loading, setLoading] = useState(true);
  const [awardedBadges, setAwardedBadges] = useState<{ id: number; name: string; icon_name: string }[]>([]);
  const { userId: viewUserId } = useRoute().params || {};
  const isOwnProfile = !viewUserId || viewUserId === loggedInProfile?.id;
  const [profileToDisplay, setProfileToDisplay] = useState<Profile | null>(null);

  const fetchProfileData = useCallback(async (profileId: string) => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, username, full_name, avatar_url, bio, age, city, state_region,
          profession, mood_status, professional_type, professional_verified,
          military_branch, military_verified, role, is_available_for_support, phone_number
        `)
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      if (isOwnProfile) {
        setLoggedInProfile(profileData as Profile);
      }

      setProfileToDisplay(profileData as Profile);

      const { data: badgeData, error: badgeError } = await supabase
        .from('user_badges')
        .select('badges ( id, name, icon_name )')
        .eq('user_id', profileId);
      if (badgeError) throw badgeError;
      setAwardedBadges(badgeData?.map(item => item.badges).filter(Boolean) || []);
    } catch (error: any) {
      Alert.alert('Error', 'Could not fetch profile. ' + error.message);
      console.error("Error fetching profile:", error);
      if (!isOwnProfile) navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, isOwnProfile, navigation, setLoggedInProfile]);

  useEffect(() => {
    if (isOwnProfile && loggedInProfile && !profileToDisplay) {
      setProfileToDisplay({ ...loggedInProfile, email: session?.user?.email });
      fetchProfileData(loggedInProfile.id);
    } else if (viewUserId && (!profileToDisplay || profileToDisplay.id !== viewUserId)) {
      fetchProfileData(viewUserId);
    } else if (!loggedInProfile && !viewUserId) {
      setLoading(false);
    }
  }, [viewUserId, loggedInProfile, profileToDisplay, isOwnProfile, fetchProfileData, session?.user?.email]);

  useEffect(() => {
    if (!loggedInProfile?.id) return;

    const profileChannel = supabase.channel(`profile-changes-${loggedInProfile.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${loggedInProfile.id}` },
        (payload) => {
          console.log('Profile update received:', payload.new);
          setLoggedInProfile(payload.new as Profile);
          setProfileToDisplay(currentProfile => ({ ...currentProfile, ...payload.new } as Profile));
        }
      )
      .subscribe();

    const badgesChannel = supabase.channel(`user-badges-changes-${loggedInProfile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${loggedInProfile.id}` },
        (payload) => {
          console.log('Badge change received, refetching badges:', payload);
          if (loggedInProfile?.id) {
            fetchProfileData(loggedInProfile.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(badgesChannel);
    };
  }, [loggedInProfile, setLoggedInProfile, fetchProfileData]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      Alert.alert("Signed Out", "You have been successfully signed out.");
      setLoggedInProfile(null);
    } catch (error: any) {
      Alert.alert("Error", `Could not sign out: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!loggedInProfile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_available_for_support: !loggedInProfile.is_available_for_support })
        .eq('id', loggedInProfile.id);

      if (error) throw error;
      setLoggedInProfile({ ...loggedInProfile, is_available_for_support: !loggedInProfile.is_available_for_support });
      Alert.alert("Success", `Support availability changed to ${!loggedInProfile.is_available_for_support ? 'ON' : 'OFF'}.`);
    } catch (error: any) {
      Alert.alert("Error", `Could not update availability: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profileToDisplay) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </SafeAreaView>
    );
  }

  const isAdminOrModerator = loggedInProfile?.role === 'admin' || loggedInProfile?.role === 'super_admin' || loggedInProfile?.role === 'moderator';
  const isSuperAdmin = loggedInProfile?.role === 'super_admin';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Left side icons */}
        <View style={styles.headerLeftIcons}>
          {isOwnProfile && isSuperAdmin && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
          {isOwnProfile && isAdminOrModerator && (
            <TouchableOpacity
              style={[styles.headerButton, styles.lowerHeaderButton]} // Added lowerHeaderButton style
              onPress={() => navigation.navigate('ReportsHub')}
            >
              <Ionicons name="flag-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
          {isOwnProfile && loggedInProfile?.role === 'support' && (
            <TouchableOpacity
              style={[styles.headerButton, styles.lowerHeaderButton]} // Added lowerHeaderButton style
              onPress={toggleAvailability}
              disabled={loading}
            >
              <Ionicons
                name={loggedInProfile.is_available_for_support ? "toggle-sharp" : "toggle-outline"}
                size={24}
                color={loggedInProfile.is_available_for_support ? COLORS.accentLight : COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center content (Avatar, Username, Full Name) */}
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: profileToDisplay.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${profileToDisplay.username?.charAt(0).toUpperCase() || 'U'}` }}
            style={styles.avatar}
          />
          <Text style={styles.headerTitle}>@{profileToDisplay.username}</Text>
          <Text style={styles.subHeader}>{profileToDisplay.full_name || 'No Name Provided'}</Text>
        </View>

        {/* Right side icons */}
        <View style={styles.headerRightIcons}>
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('EditProfile', { userId: isOwnProfile ? undefined : viewUserId })}
            >
              <Ionicons name="create-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.headerButton, styles.lowerHeaderButton]} // Added lowerHeaderButton style
              onPress={handleSignOut}
              disabled={loading}
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <VerificationBadgeDisplay profile={profileToDisplay} />
        <AwardBadgeDisplay awardedBadges={awardedBadges} />

        <ProfileForm
          initialData={profileToDisplay}
          onChange={() => {}}
          isEditable={true}
          fieldsToShow={[
            'bio', 'age', 'city', 'state_region', 'profession',
            'mood_status', 'professional_type', 'military_branch',
            'professional_verified', 'military_verified'
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBlue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 120, // Keep sufficient height for stacking
  },
  headerLeftIcons: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    // paddingTop: 10, // Optional: add padding here if needed to push all left icons down
  },
  headerRightIcons: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    // paddingTop: 10, // Optional: add padding here if needed to push all right icons down
  },
  headerCenter: {
    flex: 3,
    alignItems: 'center',
    // Adjust this marginTop if center content is too high/low relative to icons
    marginTop: 0,
  },
  headerButton: {
    padding: 8,
  },
  // New style to push down lower buttons
  lowerHeaderButton: {
    marginTop: 10, // Adjust this value to control space between top and bottom icons
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.accentLight,
    backgroundColor: COLORS.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subHeader: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  scrollViewContent: {
    paddingBottom: 40,
    paddingHorizontal: 15,
  },
});