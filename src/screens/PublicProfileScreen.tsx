import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, Text, View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';
import ProfileForm from '../components/ProfileForm';
import { VerificationBadgeDisplay, AwardBadgeDisplay } from '../components/BadgeComponents';
import { Alert } from 'react-native';
import { COLORS } from '../lib/constants';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state_region: string | null;
  profession: string | null;
  mood_status: string | null;
  professional_type: string | null;
  professional_verified: boolean;
  military_branch: string | null;
  military_verified: boolean;
  role: string;
}

const PublicProfileScreen = ({ navigation }: { navigation: any }) => {
  const { userId } = useRoute().params || {};
  const loggedInProfile = useStore((state) => state.profile);
  const [profileData, setProfileData] = useState<Partial<Profile>>({});
  const [awardedBadges, setAwardedBadges] = useState<{ id: number; name: string; icon_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = userId === loggedInProfile?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const selectFields = isOwnProfile
          ? '*'
          : 'id, username, bio, city, state_region, profession, mood_status, professional_type, professional_verified, military_branch, military_verified, role';
        const { data, error } = await supabase
          .from('profiles')
          .select(selectFields)
          .eq('id', userId)
          .single();
        if (error) throw error;
        setProfileData(data);

        const { data: badgeData, error: badgeError } = await supabase
          .from('user_badges')
          .select('badges ( id, name, icon_name )')
          .eq('user_id', userId);
        if (badgeError) throw badgeError;
        setAwardedBadges(badgeData?.map(item => item.badges).filter(Boolean) || []);
      } catch (error: any) {
        Alert.alert('Error', 'Could not load profile.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, isOwnProfile, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.secondary }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image
            source={{ uri: profileData.avatar_url || `${COLORS.DEFAULT_AVATAR_URL}${profileData.username?.charAt(0).toUpperCase() || 'U'}` }}
            style={styles.avatar}
          />
          <Text style={styles.headerTitle}>@{profileData.username}</Text>
        </View>
        <VerificationBadgeDisplay profile={profileData} />
        <Text style={styles.sectionTitle}>Honor Room</Text>
        <AwardBadgeDisplay awardedBadges={awardedBadges} />
        <ProfileForm
          initialData={profileData}
          onChange={() => {}}
          isEditable={false}
          fieldsToShow={['username', 'bio', 'city', 'state_region', 'profession', 'mood_status', 'professional_type', 'military_branch']}
        />
        <View style={styles.vibesContainer}>
          <Text style={styles.vibesText}>Vibes Score: Coming Soon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 2, borderColor: COLORS.primary },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, paddingHorizontal: 10, marginTop: 15 },
  vibesContainer: { padding: 20, alignItems: 'center' },
  vibesText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
});

export default PublicProfileScreen;