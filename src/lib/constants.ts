export const COLORS = {
  // New Primary Blues based on your request
  primaryBlue: '#3581a1',   // For buttons, navigator, prominent elements
  secondaryBlue: '#94c7da', // For general screen backgrounds
  tertiaryBlue: '#dfdfdf',  // For card backgrounds

  // Text Colors - Adjusting to ensure readability on new backgrounds
  textPrimary: '#FFFFFF', // White text for contrast on darker blues
  textSecondary: '#6A6A6A', // A darker grey for secondary text on light cards/backgrounds
  textDark: '#333333',     // Very dark text for main content on light cards

  // Accent and Alert Colors - Keeping these distinct
  accentLight: '#5EDFFF', // A bright, clear blue for active states/accents
  danger: '#FF6347',       // Strong red for panic/alert
  warning: '#FFD700',      // Yellow for warnings (if needed)

  // Greys for borders, separators - Adjusting to new palette
  border: '#B0C4DE',       // A light blue-grey for borders on background
  lightGrey: '#F5F5F5',    // Very light grey (still useful for some minimal elements)
  darkGrey: '#888888',     // For less important elements on cards

  // Default Avatar Background Color (matching a blue tone from the new palette)
  DEFAULT_AVATAR_URL: 'https://via.placeholder.com/150/',
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