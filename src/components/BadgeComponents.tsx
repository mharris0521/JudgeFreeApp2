// This file has been updated to include the new professional designations
// that you provided.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// A generic, styled badge component that the specific badges will use.
const BaseBadge = ({ text, style, textStyle }: { text: string, style?: object, textStyle?: object }) => (
    <View style={[styles.badgeBase, style]}>
        <Text style={[styles.badgeText, textStyle]}>{text}</Text>
    </View>
);

// --- Status Badges (Displayed based on fields in the 'profiles' table) ---

export const RoleBadge = ({ role }: { role: string }) => {
    if (!role || role === 'user') return null;

    const roleConfig: { [key: string]: { text: string, style: object, iconName: any } } = {
        support: { text: "Support", style: styles.support, iconName: 'heart-outline' },
        moderator: { text: "Moderator", style: styles.moderator, iconName: 'shield-checkmark-outline' },
        admin: { text: "Admin", style: styles.admin, iconName: 'key-outline' },
        super_admin: { text: "Super Admin", style: styles.superAdmin, iconName: 'star-outline' },
    };
    
    const config = roleConfig[role];
    if (!config) return null;

    return (
        <View style={[styles.badgeBase, config.style]}>
            <Ionicons name={config.iconName} size={14} color='#FFF' style={{ marginRight: 5 }} />
            <Text style={[styles.badgeText, {color: '#FFF'}]}>{config.text}</Text>
        </View>
    );
};

export const MoodBadge = ({ mood }: { mood: string | null }) => {
    if (!mood) return null;

    const moodConfig: { [key: string]: { label: string, style: object, textStyle: object } } = {
      great: { label: "Great 😄", style: styles.moodGreat, textStyle: {color: '#155724'} },
      good: { label: "Good 😊", style: styles.moodGood, textStyle: {color: '#0c5460'} },
      okay: { label: "Not Bad 🙂", style: styles.moodOkay, textStyle: {color: '#856404'} },
      struggling: { label: "Struggling 😟", style: styles.moodStruggling, textStyle: {color: '#8a4d1a'} },
      need_support: { label: "Need Support 🆘", style: styles.moodNeedSupport, textStyle: {color: '#721c24'} },
      critical: { label: "Critical 🚨", style: styles.moodCritical, textStyle: {color: '#381f61'} },
    };

    const config = moodConfig[mood];
    if (!config) return null;

    return <BaseBadge text={config.label} style={config.style} textStyle={config.textStyle} />;
};

export const MilitaryVerifiedBadge = ({ branch, isVerified }: { branch: string, isVerified: boolean }) => {
    if (!isVerified || !branch) return null;

    const branchMap: { [key: string]: { label: string, style: object, textStyle: object } } = {
        army: { label: '⭐ Army', style: styles.army, textStyle: { color: '#155724' } },
        navy: { label: '⚓ Navy', style: styles.navy, textStyle: { color: '#0c5460' } },
        air_force: { label: '✈️ Air Force', style: styles.airForce, textStyle: { color: '#004085' } },
        marines: { label: '💪 Marine Corps', style: styles.marines, textStyle: { color: '#721c24' } },
        coast_guard: { label: '🚁 Coast Guard', style: styles.coastGuard, textStyle: { color: '#856404' } },
        space_force: { label: '🚀 Space Force', style: styles.spaceForce, textStyle: { color: '#381f61' } },
    };

    const config = branchMap[branch];
    if (!config) return null;
    return <BaseBadge text={config.label} style={config.style} textStyle={config.textStyle} />;
};

// --- UPDATED: Professional Badges now include your new additions ---
export const ProfessionalVerifiedBadge = ({ type, isVerified }: { type: string, isVerified: boolean }) => {
    if (!isVerified || !type) return null;

    const profMap: { [key: string]: { label: string, style: object, textStyle: object } } = {
        paramedic: { label: '🚑 Paramedic', style: styles.paramedic, textStyle: { color: '#721c24' } },
        counselor: { label: '🧩 Counselor', style: styles.counselor, textStyle: { color: '#003585' } },
        therapist: { label: '💬 Therapist', style: styles.therapist, textStyle: { color: '#0c6054' } },
        social_worker: { label: '🧑‍🤝‍🧑 Social Worker', style: styles.socialWorker, textStyle: { color: '#4d2a86' } },
        registered_nurse: { label: '⚕️ RN', style: styles.rn, textStyle: { color: '#0c6054' } },
        psychiatrist: { label: '🧠 Psychiatrist', style: styles.psychiatrist, textStyle: { color: '#4d2a86' } },
        psychologist: { label: '🛋️ Psychologist', style: styles.psychologist, textStyle: { color: '#003585' } },
        medical_doctor: { label: '🩺 MD', style: styles.medicalDoctor, textStyle: { color: '#004085' } },
    };

    const config = profMap[type];
    if (!config) return null;
    return <BaseBadge text={config.label} style={config.style} textStyle={config.textStyle} />;
};


// --- Main Badge Display Component (UPDATED) ---
export const BadgeDisplay = ({ profile, awardedBadges }: { profile: any, awardedBadges: any[] }) => {
    return (
        <View style={styles.badgeContainer}>
            <RoleBadge role={profile.role} />
            <MoodBadge mood={profile.mood_status} />
            <MilitaryVerifiedBadge branch={profile.military_branch} isVerified={profile.military_verified} />
            <ProfessionalVerifiedBadge type={profile.professional_type} isVerified={profile.professional_verified} />
            {awardedBadges.map(badge => (
                <BaseBadge key={badge.id} text={badge.name} style={styles.achievement} textStyle={{ color: '#FFF' }}/>
            ))}
        </View>
    );
};


const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 15,
  },
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Role Styles (dark background, white text)
  support: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  moderator: { backgroundColor: '#2980b9', borderColor: '#2980b9' },
  admin: { backgroundColor: '#8e44ad', borderColor: '#8e44ad' },
  superAdmin: { backgroundColor: '#f39c12', borderColor: '#f39c12' },
  achievement: { backgroundColor: '#d35400', borderColor: '#d35400' },

  // Mood & Verification Styles (light background, dark text)
  moodGreat: { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  moodGood: { backgroundColor: '#d1ecf1', borderColor: '#bee5eb' },
  moodOkay: { backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
  moodStruggling: { backgroundColor: '#ffe8d6', borderColor: '#fed5b1' },
  moodNeedSupport: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
  moodCritical: { backgroundColor: '#e2d9f3', borderColor: '#d3c3ed' },
  
  army: { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  navy: { backgroundColor: '#d1ecf1', borderColor: '#bee5eb' },
  airForce: { backgroundColor: '#cce5ff', borderColor: '#b8daff' },
  marines: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
  coastGuard: { backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
  spaceForce: { backgroundColor: '#e2d9f3', borderColor: '#d3c3ed' },

  paramedic: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
  counselor: { backgroundColor: '#d6e4ff', borderColor: '#b8d0ff' },
  therapist: { backgroundColor: '#d1f1e9', borderColor: '#bee5e0' },
  socialWorker: { backgroundColor: '#e8dff5', borderColor: '#d9c8f0' },
  rn: { backgroundColor: '#d1f1e9', borderColor: '#bee5e0' },
  psychiatrist: { backgroundColor: '#e8dff5', borderColor: '#d9c8f0' },
  psychologist: { backgroundColor: '#d6e4ff', borderColor: '#b8d0ff' },
  medicalDoctor: { backgroundColor: '#cce5ff', borderColor: '#b8daff' },
});
