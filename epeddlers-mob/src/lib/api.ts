import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'ep_token';

// SecureStore holds the auth token; AsyncStorage caches non-sensitive reference data.
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}
export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const ax = err as AxiosError<any>;
  return ax?.response?.data?.error?.message || ax?.message || fallback;
}

// --- Non-sensitive cache helpers (AsyncStorage) ----------------------------
export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `cache:${key}`,
      JSON.stringify({ at: Date.now(), value }),
    );
  } catch {
    // caching is best-effort
  }
}

export async function cacheGet<T>(key: string, maxAgeMs = 1000 * 60 * 60): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.value as T;
  } catch {
    return null;
  }
}

export async function clearAccountCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith('cache:'));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // ignore
  }
}

export default api;
