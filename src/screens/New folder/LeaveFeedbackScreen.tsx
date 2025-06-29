import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // <-- THIS IMPORT WAS MISSING
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../lib/store';

// A simple star rating component
const StarRating = ({ rating, onRate }: { rating: number, onRate: (rate: number) => void }) => {
    return (
        <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => onRate(star)}>
                    <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? '#f39c12' : '#777'}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

export default function LeaveFeedbackScreen({ navigation }: { navigation: any }) {
  const route = useRoute();
  const { alert_id, supporter_id } = route.params as { alert_id: number, supporter_id: string };
  
  const activator = useStore((state) => state.profile);

  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
        Alert.alert("Rating Required", "Please select a star rating to submit your feedback.");
        return;
    }
    if (!activator) return;

    setLoading(true);
    try {
        const { error } = await supabase.from('supporter_feedback').insert({
            alert_id: alert_id,
            supporter_id: supporter_id,
            activator_id: activator.id,
            rating: rating,
            comments: comments.trim(),
        });

        if (error) throw error;

        Alert.alert("Feedback Submitted", "Thank you for helping improve our community!");
        navigation.goBack();

    } catch (error: any) {
        Alert.alert("Error", `Could not submit feedback. ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave Feedback</Text>
        <Text style={styles.headerSubtitle}>How was your experience with the supporter?</Text>
      </View>

      <View style={styles.content}>
        <StarRating rating={rating} onRate={setRating} />
        
        <Text style={styles.label}>Optional Comments</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 'They were a great listener and really helped me.'"
          placeholderTextColor="#888"
          value={comments}
          onChangeText={setComments}
          multiline
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.button, styles.submitButton]} 
            onPress={handleSubmitFeedback}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>Submit Feedback</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  headerSubtitle: { color: '#AAA', fontSize: 16, marginTop: 10, textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 30 },
  label: { color: '#AAA', fontSize: 16, marginBottom: 10, marginTop: 20 },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  button: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  submitButton: { backgroundColor: '#27ae60' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});