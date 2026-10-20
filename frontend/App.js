import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { setAuthToken } from './src/api';

export default function App() {
  const [token, setToken] = useState(null);

  const handleLogin = (newToken) => {
    setAuthToken(newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {token ? (
        <DashboardScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF4DE',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : Platform.OS === 'ios' ? 48 : 0,
  },
});
