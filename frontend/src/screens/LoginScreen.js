import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../api';
import { showAlert } from '../alerts';

const K = { bg: '#FFF4DE', ink: '#111111', yellow: '#FFD23F', pink: '#FF6B9A', blue: '#3A86FF', white: '#FFFFFF' };

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showAlert('Login Failed', 'Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      if (data && data.success && data.token) {
        onLoginSuccess(data.token);
      } else {
        showAlert('Login Failed', 'Unexpected response from server.');
      }
    } catch (err) {
      showAlert('Login Failed', err.status === 401 ? 'Invalid username or password.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <View style={s.logoRow}>
          <View style={s.logo}>
            <Text style={s.logoText}>HR/OS</Text>
          </View>
          <View style={s.tag}>
            <Text style={s.tagText}>v2026</Text>
          </View>
        </View>

        <Text style={s.headline}>STAFF{'\n'}CONSOLE.</Text>
        <Text style={s.lead}>Log in to manage people & pay.</Text>

        <View style={s.card}>
          <Text style={s.label}>USERNAME</Text>
          <TextInput
            style={s.input}
            placeholder="admin"
            placeholderTextColor="#9A9A9A"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={s.label}>PASSWORD</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9A9A9A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={K.ink} /> : <Text style={s.buttonText}>LOG IN →</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const hard = { borderWidth: 2.5, borderRightWidth: 7, borderBottomWidth: 7, borderColor: K.ink };

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: K.bg, justifyContent: 'center', padding: 20 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logo: { backgroundColor: K.ink, paddingHorizontal: 12, paddingVertical: 7 },
  logoText: { color: K.yellow, fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  tag: {
    marginLeft: 10,
    backgroundColor: K.pink,
    borderWidth: 2,
    borderColor: K.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-4deg' }],
  },
  tagText: { fontWeight: '900', fontSize: 12, color: K.ink },
  headline: { fontSize: 46, lineHeight: 48, fontWeight: '900', color: K.ink },
  lead: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 8, marginBottom: 24 },
  card: { ...hard, backgroundColor: K.blue, padding: 18 },
  label: { color: K.white, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: K.white,
    borderWidth: 2.5,
    borderColor: K.ink,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: K.ink,
    marginBottom: 16,
  },
  button: { ...hard, borderRightWidth: 5, borderBottomWidth: 5, backgroundColor: K.yellow, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: K.ink, fontWeight: '900', fontSize: 16, letterSpacing: 2 },
});
