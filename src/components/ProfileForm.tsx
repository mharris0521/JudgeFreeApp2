import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS, MOOD_STATUSES, PROFESSIONAL_TYPES, MILITARY_BRANCHES } from '../lib/constants';
import { Profile } from '../lib/store';
import { Ionicons } from '@expo/vector-icons';

type ProfileFormProps = {
  initialData: Partial<Profile>;
  onChange: (key: string, value: any) => void;
  isEditable: boolean; // Determines if inputs are editable or just displayed
  isAdmin?: boolean; // Determines if admin-specific fields/labels are shown
  fieldsToShow?: string[];
  // Props for user-facing toggles and their controlled picker visibility (only relevant when isEditable is true)
  showProfessionalPicker?: boolean;
  setShowProfessionalPicker?: (val: boolean) => void;
  showMilitaryPicker?: boolean;
  setShowMilitaryPicker?: (val: boolean) => void;
};

const ProfileForm = ({
  initialData,
  onChange,
  isEditable,
  isAdmin = false,
  fieldsToShow = [],
  showProfessionalPicker,
  setShowProfessionalPicker,
  showMilitaryPicker,
  setShowMilitaryPicker,
}: ProfileFormProps) => {

  const fields = [
    { key: 'username', label: 'Public Username', placeholder: '@your_username' },
    { key: 'full_name', label: 'Full Name (Private)', placeholder: 'e.g., Jane Doe', isPrivate: true },
    { key: 'phone_number', label: 'Phone Number (Private)', placeholder: '(555) 555-5555', isPrivate: true, keyboardType: 'phone-pad' },
    { key: 'bio', label: 'Bio', placeholder: 'Tell us about yourself', multiline: true },
    { key: 'age', label: 'Age', placeholder: 'e.g., 30', keyboardType: 'numeric' },
    { key: 'city', label: 'City', placeholder: 'e.g., New York' },
    { key: 'state_region', label: 'State/Region', placeholder: 'e.g., NY' },
    { key: 'profession', label: 'Profession', placeholder: 'e.g., Teacher' },
    { key: 'mood_status', label: 'Mood Status', placeholder: 'Select your mood', type: 'picker', options: MOOD_STATUSES },

    // User-facing toggle for Professional Designation (only when editable)
    {
      key: 'user_professional_toggle',
      label: 'Designate Professional Status',
      type: 'user-toggle',
      toggleState: showProfessionalPicker,
      setToggleState: setShowProfessionalPicker,
      relatedPickerKey: 'professional_type',
    },
    // Professional Type picker - now conditionally rendered or displayed as text
    {
      key: 'professional_type',
      label: 'Professional Type (for verification)',
      placeholder: 'Select your profession',
      type: 'picker',
      options: PROFESSIONAL_TYPES,
      dependsOnPickerToggle: 'user_professional_toggle',
    },

    // User-facing toggle for Military Branch (only when editable)
    {
      key: 'user_military_toggle',
      label: 'Designate Military Service',
      type: 'user-toggle',
      toggleState: showMilitaryPicker,
      setToggleState: setShowMilitaryPicker,
      relatedPickerKey: 'military_branch',
    },
    // Military Branch picker - now conditionally rendered or displayed as text
    {
      key: 'military_branch',
      label: 'Military Branch (for verification)',
      placeholder: 'Select your branch',
      type: 'picker',
      options: MILITARY_BRANCHES,
      dependsOnPickerToggle: 'user_military_toggle',
    },

    // Admin-only toggles for actual verified status (always admin-specific label)
    { key: 'professional_verified', label: 'Professional Verified Status (Admin Only)', type: 'admin-toggle', isPrivate: true },
    { key: 'military_verified', label: 'Military Verified Status (Admin Only)', type: 'admin-toggle', isPrivate: true },
  ].filter(field => {
    // Basic filtering based on fieldsToShow
    const shouldShowBasedOnFieldsToShow = fieldsToShow.length === 0 || fieldsToShow.includes(field.key);
    if (!shouldShowBasedOnFieldsToShow) return false;

    // Admin-only toggle filtering:
    if (field.type === 'admin-toggle') {
      return isAdmin; // Only show admin toggles to admins
    }

    // User-toggle filtering:
    // Only show 'user-toggle' fields if it's editable AND it's not an admin view
    if (field.type === 'user-toggle') {
      return isEditable && !isAdmin;
    }

    // Picker conditional rendering/display logic:
    // Pickers (professional_type, military_branch, mood_status) should always show if it's an admin view,
    // OR if it's editable AND the corresponding user-toggle is ON.
    // If not editable (view-only), they should also show if they have a value.
    if (field.type === 'picker') { // Check for any picker type
        if (isAdmin) return true; // Admins see all pickers

        if (isEditable) { // If editable, respect the user-toggle state for professional/military, mood always
            if (field.key === 'mood_status') return true; // Mood picker is always visible if editable
            if (field.key === 'professional_type' && showProfessionalPicker) return true;
            if (field.key === 'military_branch' && showMilitaryPicker) return true;
            return false; // Hide professional/military pickers if editable but toggle is off
        }
        // If not editable (view-only mode), show if there's a value
        return !!initialData[field.key];
    }

    return true; // All other fields (text inputs) are shown if in fieldsToShow
  });

  // Helper to find mood label
  const getMoodLabel = (value: string | null) => {
    const mood = MOOD_STATUSES.find(status => status.value === value);
    return mood ? mood.label : 'Not Set';
  };
  
  // Helper to find professional type label
  const getProfessionalTypeLabel = (value: string | null) => {
    const profType = PROFESSIONAL_TYPES.find(type => type.value === value);
    return profType ? profType.label : 'Not Set';
  };

  // Helper to find military branch label
  const getMilitaryBranchLabel = (value: string | null) => {
    const branch = MILITARY_BRANCHES.find(b => b.value === value);
    return branch ? branch.label : 'Not Set';
  };


  return (
    <View style={styles.form}>
      {fields.map((field) => (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={[styles.label, field.isPrivate && styles.privateLabel]}>{field.label}</Text>

          {field.type === 'picker' ? (
            isEditable ? ( // Render picker if editable
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={initialData[field.key] || ''}
                  onValueChange={(value) => onChange(field.key, value)}
                  style={styles.picker}
                  enabled={isEditable}
                >
                  {field.options?.map(({ label, value }) => (
                    <Picker.Item key={value} label={label} value={value} />
                  ))}
                </Picker>
              </View>
            ) : ( // Render as Text if not editable
              <Text style={styles.readOnlyText}>
                {
                  field.key === 'mood_status' ? getMoodLabel(initialData[field.key]?.toString() || '') :
                  field.key === 'professional_type' ? getProfessionalTypeLabel(initialData[field.key]?.toString() || '') :
                  field.key === 'military_branch' ? getMilitaryBranchLabel(initialData[field.key]?.toString() || '') :
                  initialData[field.key]?.toString() || 'Not Set'
                }
              </Text>
            )
          ) : field.type === 'user-toggle' ? (
            <TouchableOpacity
              onPress={() => {
                // Ensure setToggleState is a function before calling
                if (field.setToggleState) {
                  field.setToggleState(!field.toggleState);
                  // If toggling OFF, clear the related picker's value in formData
                  if (field.toggleState && field.relatedPickerKey) {
                    onChange(field.relatedPickerKey, ''); // Clear the value if toggle goes to 'No'
                  }
                }
              }}
              style={[
                styles.toggleButton,
                !isEditable && styles.disabledToggle,
                field.toggleState ? styles.toggleOn : styles.toggleOff
              ]}
              disabled={!isEditable}
            >
              <Ionicons
                name={field.toggleState ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={24}
                color={COLORS.textPrimary}
              />
              <Text style={styles.toggleText}>
                {field.toggleState ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          ) : field.type === 'admin-toggle' ? (
            // Admin-only toggle logic
            <TouchableOpacity
              onPress={() => onChange(field.key, !initialData[field.key])}
              style={[
                styles.toggleButton,
                !isEditable && styles.disabledToggle, // Should not be disabled if form is editable (true on EditProfileScreen for admins)
                initialData[field.key] ? styles.toggleOn : styles.toggleOff
              ]}
              disabled={!isEditable}
            >
              <Ionicons
                name={initialData[field.key] ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={24}
                color={COLORS.textPrimary}
              />
              <Text style={styles.toggleText}>
                {initialData[field.key] ? 'Verified (Yes)' : 'Not Verified (No)'}
              </Text>
            </TouchableOpacity>
          ) : (
            // Default TextInput for other fields
            <TextInput
              style={[styles.input, field.multiline && styles.multilineInput]}
              value={initialData[field.key]?.toString() || ''}
              onChangeText={(val) => onChange(field.key, val)}
              placeholder={field.placeholder}
              placeholderTextColor={COLORS.textSecondary}
              editable={isEditable}
              keyboardType={field.keyboardType}
              multiline={field.multiline}
            />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  form: { padding: 20 },
  fieldContainer: { marginBottom: 15 },
  label: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 10, marginTop: 20 },
  privateLabel: { color: COLORS.danger },
  input: { backgroundColor: COLORS.secondary, color: COLORS.textPrimary, borderRadius: 10, padding: 15, fontSize: 16 },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  pickerContainer: { backgroundColor: COLORS.secondary, borderRadius: 10 },
  picker: { color: COLORS.textPrimary },
  readOnlyText: { // New style for read-only text fields
    backgroundColor: COLORS.secondary,
    color: COLORS.textPrimary,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 50,
    justifyContent: 'center', // Center vertically
    alignItems: 'flex-start', // Align text to start
    paddingTop: 15, // Align text with input padding
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  toggleOn: {
    backgroundColor: COLORS.success,
  },
  toggleOff: {
    backgroundColor: COLORS.danger,
  },
  disabledToggle: {
    opacity: 0.6,
  },
  toggleText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ProfileForm;
