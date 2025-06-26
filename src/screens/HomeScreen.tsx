// This is the baseline placeholder for the Home screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Home Screen</Text>
      <Text style={styles.subtext}>Your personal dashboard, badges, and vibes will be here.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1A1A1A' 
  },
  text: { 
    color: '#FFF', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  subtext: { 
    color: '#AAA', 
    fontSize: 16, 
    marginTop: 10, 
    textAlign: 'center', 
    paddingHorizontal: 20 
  },
});
