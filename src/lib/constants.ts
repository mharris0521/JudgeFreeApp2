// src/lib/constants.ts
export const COLORS = {
  primary: '#3498db',
  danger: '#e74c3c',
  warning: '#f39c12',
  secondary: '#2C2C2E',
  textPrimary: '#FFF',
  textSecondary: '#AAA',
  disabled: '#555',
};

export const DEFAULT_AVATAR_URL = 'https://placehold.co/60x60/2C2C2E/FFF?text=';

export const REPORT_CATEGORIES = [
  { label: 'Harassment', value: 'harassment' },
  { label: 'Spam', value: 'spam' },
  { label: 'Inappropriate Content', value: 'inappropriate_content' },
  { label: 'Other', value: 'other' },
];

export const MOOD_STATUSES = [
  { label: 'Not Set', value: '' },
  { label: 'Great 😄', value: 'great' },
  { label: 'Good 😊', value: 'good' },
  { label: 'Not Bad 🙂', value: 'okay' },
  { label: 'Struggling 😟', value: 'struggling' },
  { label: 'Need Support 🆘', value: 'need_support' },
  { label: 'Critical 🚨', value: 'critical' },
];

export const PROFESSIONAL_TYPES = [
  { label: 'None', value: '' },
  { label: 'Paramedic', value: 'paramedic' },
  { label: 'Registered Nurse', value: 'registered_nurse' },
  { label: 'Counselor', value: 'counselor' },
  { label: 'Therapist', value: 'therapist' },
  { label: 'Social Worker', value: 'social_worker' },
  { label: 'Psychologist', value: 'psychologist' },
  { label: 'Psychiatrist', value: 'psychiatrist' },
  { label: 'Medical Doctor', value: 'medical_doctor' },
];

export const MILITARY_BRANCHES = [
  { label: 'Not Applicable', value: '' },
  { label: 'Army', value: 'army' },
  { label: 'Navy', value: 'navy' },
  { label: 'Air Force', value: 'air_force' },
  { label: 'Marine Corps', value: 'marines' },
  { label: 'Coast Guard', value: 'coast_guard' },
  { label: 'Space Force', value: 'space_force' },
];