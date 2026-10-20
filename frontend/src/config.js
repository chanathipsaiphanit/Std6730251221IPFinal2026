import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PORT = 3000;

// Auto-detect the backend address:
// - Phone with Expo Go: uses the same IP as the computer running Metro (from hostUri)
// - Android emulator: 10.0.2.2 points to the host computer
// - Web / iOS simulator: localhost
// To override, set EXPO_PUBLIC_API_URL, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
function guessApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri && Platform.OS !== 'web') {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${PORT}`;
    }
  }
  if (Platform.OS === 'android') return `http://10.0.2.2:${PORT}`;
  return `http://localhost:${PORT}`;
}

// Default: backend deployed on the cloud server (port from /app/.env).
// To use a local backend instead: EXPO_PUBLIC_API_URL=local npx expo start
const CLOUD_API_URL = 'http://119.59.102.161:3093';
const envUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = envUrl === 'local' ? guessApiUrl() : envUrl || CLOUD_API_URL;
