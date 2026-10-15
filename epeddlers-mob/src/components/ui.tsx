import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle,
} from 'react-native';
import { Colors } from '@/lib/config';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, disabled, loading, variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
}) {
  const bg = variant === 'primary' ? Colors.primary : variant === 'danger' ? Colors.danger : Colors.surface;
  const fg = variant === 'outline' ? Colors.darkGreen : '#fff';
  const border = variant === 'outline' ? Colors.border : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Badge({ text, tone = 'info' }: { text: string; tone?: 'info' | 'success' | 'danger' | 'warning' }) {
  const map = {
    info: { bg: '#dbeafe', fg: '#1d4ed8' },
    success: { bg: '#dcfce7', fg: '#166534' },
    danger: { bg: '#fee2e2', fg: '#b91c1c' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfaceMuted, padding: 16 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, padding: 16,
  },
  button: {
    minHeight: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 16,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.darkGreen },
  muted: { fontSize: 13, color: Colors.textMuted },
  empty: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  emptyTitle: { fontWeight: '600', color: '#374151', marginBottom: 4 },
});
