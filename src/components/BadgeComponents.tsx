import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

// Generic badge component
const BaseBadge = ({ text, iconName, style, textStyle }: { text: string, iconName?: string, style?: object, textStyle?: object }) => (
  <View style={[styles.badgeBase, style]}>
    {iconName && <Ionicons name={iconName} size={14} color={COLORS.textPrimary} style={{ marginRight: 5 }} />}
    <Text style={[styles.badgeText, textStyle]}>{text}</Text>
  </View>
);

// Verification Badges (from profiles table)
export const RoleBadge = ({ role }: { role: string }) => {
  if (!role || role === 'user') return null;
  const roleConfig = {
    support: { text: "Support", style: styles.support, iconName: 'heart-outline' },
    moderator: { text: "Moderator", style: styles.moderator, iconName: 'shield-checkmark-outline' },
    admin: { text: "Admin", style: styles.admin, iconName: 'key-outline' },
    super_admin: { text: "Super Admin", style: styles.superAdmin, iconName: 'star-outline' },
  }[role] || null;
  if (!roleConfig) return null;
  return <BaseBadge {...roleConfig} />;
};

export const MoodBadge = ({ mood }: { mood: string | null }) => {
  if (!mood) return null;
  const moodConfig = {
    great: { label: "Great 😄", style: styles.moodGreat, textStyle: { color: '#155724' } },
    good: { label: "Good 😊", style: styles.moodGood, textStyle: { color: '#0c5460' } },
    okay: { label: "Not Bad 🙂", style: styles.moodOkay, textStyle: { color: '#856404' } },
    struggling: { label: "Struggling 😟", style: styles.moodStruggling, textStyle: { color: '#8a4d1a' } },
    need_support: { label: "Need Support 🆘", style: styles.moodNeedSupport, textStyle: { color: '#721c24' } },
    critical: { label: "Critical 🚨", style: styles.moodCritical, textStyle: { color: '#381f61' } },
  }[mood] || null;
  if (!moodConfig) return null;
  return <BaseBadge text={moodConfig.label} style={moodConfig.style} textStyle={moodConfig.textStyle} />;
};

export const MilitaryVerifiedBadge = ({ branch, isVerified }: { branch: string, isVerified: boolean }) => {
  if (!isVerified || !branch) return null;
  const branchMap = {
    army: { label: '⭐ Army', style: styles.army, textStyle: { color: '#155724' } },
    navy: { label: '⚓ Navy', style: styles.navy, textStyle: { color: '#0c5460' } },
    air_force: { label: '✈️ Air Force', style: styles.airForce, textStyle: { color: '#004085' } },
    marines: { label: '💪 Marine Corps', style: styles.marines, textStyle: { color: '#721c24' } },
    coast_guard: { label: '🚁 Coast Guard', style: styles.coastGuard, textStyle: { color: '#856404' } },
    space_force: { label: '🚀 Space Force', style: styles.spaceForce, textStyle: { color: '#381f61' } },
  }[branch] || null;
  if (!branchMap) return null;
  return <BaseBadge text={branchMap.label} style={branchMap.style} textStyle={branchMap.textStyle} />;
};

export const ProfessionalVerifiedBadge = ({ type, isVerified }: { type: string, isVerified: boolean }) => {
  if (!isVerified || !type) return null;
  const profMap = {
    paramedic: { label: '🚑 Paramedic', style: styles.paramedic, textStyle: { color: '#721c24' } },
    counselor: { label: '🧩 Counselor', style: styles.counselor, textStyle: { color: '#003585' } },
    therapist: { label: '💬 Therapist', style: styles.therapist, textStyle: { color: '#0c6054' } },
    social_worker: { label: '🧑‍🤝‍🧑 Social Worker', style: styles.socialWorker, textStyle: { color: '#4d2a86' } },
    registered_nurse: { label: '⚕️ RN', style: styles.rn, textStyle: { color: '#0c6054' } },
    psychiatrist: { label: '🧠 Psychiatrist', style: styles.psychiatrist, textStyle: { color: '#4d2a86' } },
    psychologist: { label: '🛋️ Psychologist', style: styles.psychologist, textStyle: { color: '#003585' } },
    medical_doctor: { label: '🩺 MD', style: styles.medicalDoctor, textStyle: { color: '#004085' } },
  }[type] || null;
  if (!profMap) return null;
  return <BaseBadge text={profMap.label} style={profMap.style} textStyle={profMap.textStyle} />;
};

// Award Badges (from user_badges table)
export const AwardBadge = ({ name, iconName }: { name: string, iconName?: string }) => (
  <BaseBadge text={name} iconName={iconName || 'ribbon-outline'} style={styles.achievement} textStyle={{ color: COLORS.textPrimary }} />
);

// Main Display Components
export const VerificationBadgeDisplay = ({ profile }: { profile: any }) => (
  <View style={styles.badgeContainer}>
    <RoleBadge role={profile.role} />
    <MoodBadge mood={profile.mood_status} />
    <MilitaryVerifiedBadge branch={profile.military_branch} isVerified={profile.military_verified} />
    <ProfessionalVerifiedBadge type={profile.professional_type} isVerified={profile.professional_verified} />
  </View>
);

export const AwardBadgeDisplay = ({ awardedBadges }: { awardedBadges: { id: number; name: string; icon_name: string }[] }) => (
  <View style={styles.badgeContainer}>
    {awardedBadges.map((badge) => (
      <AwardBadge key={badge.id} name={badge.name} iconName={badge.icon_name} />
    ))}
  </View>
);

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
  support: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  moderator: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  admin: { backgroundColor: COLORS.info, borderColor: COLORS.info },
  superAdmin: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  achievement: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },

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