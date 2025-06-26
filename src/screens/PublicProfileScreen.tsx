// UPDATED: The form now includes a field for the user's private phone number.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';

export default function EditProfileScreen({ navigation }: { navigation: any }) {
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);
  
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    age: profile?.age?.toString() || '',
    phone_number: profile?.phone_number || '', // <-- NEW
    city: profile?.city || '',
    state_region: profile?.state_region || '',
    profession: profile?.profession || '',
    mood_status: profile?.mood_status || '',
    professional_type: profile?.professional_type || '',
    military_branch: profile?.military_branch || '',
  });
  const [loading, setLoading] = useState(false);

  const handleUpdate = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const onSaveChanges = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          age: parseInt(formData.age, 10) || null,
          phone_number: formData.phone_number, // <-- NEW
          city: formData.city,
          state_region: formData.state_region,
          profession: formData.profession,
          mood_status: formData.mood_status,
          professional_type: formData.professional_type,
          military_branch: formData.military_branch,
        })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error) throw error;

      setProfile(updatedProfile);
      Alert.alert("Success", "Your profile has been updated.");
      navigation.goBack();

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}><Text style={styles.headerTitle}>Edit Profile</Text></View>
        <View style={styles.form}>
          <Text style={styles.label}>Public Username</Text>
          <TextInput style={styles.input} value={formData.username} onChangeText={(val) => handleUpdate('username', val)} placeholder="@your_username" />
          
          <Text style={styles.label}>Full Name (Private)</Text>
          <TextInput style={styles.input} value={formData.full_name} onChangeText={(val) => handleUpdate('full_name', val)} placeholder="e.g., Jane Doe" />

          <Text style={styles.label}>Phone Number (Private)</Text>
          <TextInput style={styles.input} value={formData.phone_number} onChangeText={(val) => handleUpdate('phone_number', val)} placeholder="(555) 555-5555" keyboardType="phone-pad" />

          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea]} value={formData.bio} onChangeText={(val) => handleUpdate('bio', val)} placeholder="Tell the community a little about yourself..." multiline />

          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={formData.age} onChangeText={val => handleUpdate('age', val)} placeholder="Your age"/>
          
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={formData.city} onChangeText={val => handleUpdate('city', val)} placeholder="e.g., San Francisco" />
          
          <Text style={styles.label}>State/Region</Text>
          <TextInput style={styles.input} value={formData.state_region} onChangeText={val => handleUpdate('state_region', val)} placeholder="e.g., CA" />

          <Text style={styles.label}>Profession</Text>
          <TextInput style={styles.input} value={formData.profession} onChangeText={val => handleUpdate('profession', val)} placeholder="e.g., Student, Engineer, etc." />

          <Text style={styles.label}>Current Mood</Text>
          <View style={styles.pickerContainer}><Picker selectedValue={formData.mood_status} onValueChange={(val) => handleUpdate('mood_status', val)} style={styles.picker} itemStyle={styles.pickerItem}><Picker.Item label="Not Set" value="" /><Picker.Item label="Great 😄" value="great" /><Picker.Item label="Good 😊" value="good" /><Picker.Item label="Not Bad 🙂" value="okay" /><Picker.Item label="Struggling 😟" value="struggling" /><Picker.Item label="Need Support 🆘" value="need_support" /><Picker.Item label="Critical 🚨" value="critical" /></Picker></View>
          
          <Text style={styles.label}>Professional Designation (for verification)</Text>
          <View style={styles.pickerContainer}><Picker selectedValue={formData.professional_type} onValueChange={(val) => handleUpdate('professional_type', val)} style={styles.picker} itemStyle={styles.pickerItem}><Picker.Item label="None" value="" /><Picker.Item label="Paramedic" value="paramedic" /><Picker.Item label="Registered Nurse" value="registered_nurse" /><Picker.Item label="Counselor" value="counselor" /><Picker.Item label="Therapist" value="therapist" /><Picker.Item label="Social Worker" value="social_worker" /><Picker.Item label="Psychologist" value="psychologist" /><Picker.Item label="Psychiatrist" value="psychiatrist" /><Picker.Item label="Medical Doctor" value="medical_doctor" /></Picker></View>

          <Text style={styles.label}>Military Service (for verification)</Text>
          <View style={styles.pickerContainer}><Picker selectedValue={formData.military_branch} onValueChange={(val) => handleUpdate('military_branch', val)} style={styles.picker} itemStyle={styles.pickerItem}><Picker.Item label="Not Applicable" value="" /><Picker.Item label="Army" value="army" /><Picker.Item label="Navy" value="navy" /><Picker.Item label="Air Force" value="air_force" /><Picker.Item label="Marine Corps" value="marines" /><Picker.Item label="Coast Guard" value="coast_guard" /><Picker.Item label="Space Force" value="space_force" /></Picker></View>
        </View>

        <View style={styles.footer}><TouchableOpacity style={styles.saveButton} onPress={onSaveChanges} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}</TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={[styles.buttonText, {color: '#AAA'}]}>Cancel</Text></TouchableOpacity></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1A1A' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
    form: { padding: 20 },
    label: { color: '#AAA', fontSize: 16, marginBottom: 10, marginTop: 20 },
    input: { backgroundColor: '#2C2C2E', color: '#FFF', borderRadius: 10, padding: 15, fontSize: 16 },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    pickerContainer: { backgroundColor: '#2C2C2E', borderRadius: 10, justifyContent: 'center' },
    picker: { color: '#FFF' },
    pickerItem: { color: '#FFF', backgroundColor: '#2C2C2E' },
    footer: { padding: 20, marginTop: 20 },
    saveButton: { backgroundColor: '#3498db', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: 'transparent', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
