import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from './src/lib/supabaseClient';
import { useStore, Profile } from './src/lib/store';

// Screen Imports
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MyChatsScreen from './src/screens/MyChatsScreen';
import CommunityAlertsScreen from './src/screens/CommunityAlertsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ResponseInboxScreen from './src/screens/ResponseInboxScreen';
import CrisisChatScreen from './src/screens/CrisisChatScreen';
import AlertDetailsScreen from './src/screens/AlertDetailsScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import ActiveAlertScreen from './src/screens/ActiveAlertScreen';
import LeaveFeedbackScreen from './src/screens/LeaveFeedbackScreen'; // <-- NEW IMPORT

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const navigation = useNavigation<any>();
  const profile = useStore((state) => state.profile);

  const handleCrisisPress = async () => {
    if (!profile) return;
    try {
        const { data, error } = await supabase
            .from('crisis_alerts')
            .select('id')
            .eq('created_by', profile.id)
            .eq('status', 'active')
            .maybeSingle(); 

        if (error) throw error;
        
        if (data) {
            navigation.navigate('ActiveAlert', { alert_id: data.id });
        } else {
            navigation.navigate('AlertDetails');
        }

    } catch (error: any) {
        Alert.alert("Error", "Could not check your alert status. " + error.message);
    }
  };

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: styles.tabBar, tabBarActiveTintColor: '#3498db', tabBarInactiveTintColor: '#8e8e93' }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="MyChats" component={MyChatsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Panic" options={{ tabBarButton: () => (<TouchableOpacity style={styles.panicButtonContainer} onPress={handleCrisisPress}><Ionicons name="shield-half-outline" size={40} color="#fff" /></TouchableOpacity>) }}>
        {() => null}
      </Tab.Screen>
      <Tab.Screen name="CommunityAlerts" component={CommunityAlertsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const setProfile = useStore((state) => state.setProfile);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (!isAuthReady) setIsAuthReady(true); });
  }, [setSession, isAuthReady]);

  useEffect(() => {
    const fetchProfile = async () => { if (session?.user) { const { data, error } = await supabase.from('profiles').select(`*`).eq('id', session.user.id).single(); if (error) { Alert.alert("Error", "Could not fetch profile."); } else if (data) { setProfile(data as Profile); } } };
    if (session) { fetchProfile(); } else { setProfile(null); }
  }, [session, setProfile]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const privateChannel = supabase.channel(`private-notifications-for-${session.user.id}`);
    privateChannel.on('broadcast', { event: 'offer_accepted' }, ({ payload }) => { Alert.alert( "Your Offer Was Accepted!", payload.message, [ { text: "Later" }, ]); }).subscribe();
    return () => { supabase.removeChannel(privateChannel); };
  }, [session]);

  if (!isAuthReady) {
    return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' }}><ActivityIndicator size="large" color="#FFF" /></View>);
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session && session.user ? (
            <>
              <Stack.Screen name="MainApp" component={MainTabNavigator} />
              <Stack.Screen name="ResponseInbox" component={ResponseInboxScreen} />
              <Stack.Screen name="CrisisChat" component={CrisisChatScreen} />
              <Stack.Screen name="LeaveFeedback" component={LeaveFeedbackScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="ActiveAlert" component={ActiveAlertScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ presentation: 'modal' }} />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 0, backgroundColor: '#2C2C2E', borderRadius: 15, height: 70, borderTopWidth: 0 },
  panicButtonContainer: { top: -30, justifyContent: 'center', alignItems: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: '#e74c3c', shadowColor: '#e74c3c', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 3.5, elevation: 5 },
});