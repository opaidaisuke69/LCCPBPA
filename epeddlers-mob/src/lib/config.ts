import { Platform } from 'react-native';

/**
 * API base URL.
 *
 * - Android emulator reaches the host machine via 10.0.2.2.
 * - iOS simulator and web can use localhost.
 * - On a physical device (Expo Go), set EXPO_PUBLIC_API_URL to your computer's
 *   LAN IP, e.g. http://192.168.1.20:8099/api/v1
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const port = 8099;
  if (Platform.OS === 'android') return `http://192.168.8.147:${port}/api/v1`;
  return `http://localhost:${port}/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl();

export const Colors = {
  primary: '#4F7D32',
  secondary: '#4A943E',
  accent: '#2A7C13',
  darkGreen: '#165823',
  deepGreen: '#1B5E20',
  surface: '#ffffff',
  surfaceMuted: '#f5f7f4',
  border: '#e3e8e0',
  text: '#1f2a24',
  textMuted: '#6b7280',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
};
