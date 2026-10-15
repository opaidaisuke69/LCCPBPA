import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { Button, Card, Label } from '@/components/ui';
import { Colors } from '@/lib/config';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Already signed in -> go to the authed area.
  // Cast: route types regenerate when the Expo dev server runs.
  if (user) return <Redirect href={'/(app)' as any} />;

  async function handleLogin() {
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      // Redirect handled by the `user` state change on next render.
    } catch (err) {
      setError(errorMessage(err, 'Login failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>eP</Text>
          </View>
          <Text style={styles.appName}>ePeddlers</Text>
          <Text style={styles.sub}>La Carlota City · Field Officer App</Text>
        </View>

        <Card>
          <Text style={styles.cardTitle}>Officer Sign In</Text>
          <Text style={styles.cardSub}>For authorized administrative personnel.</Text>

          <View style={{ marginTop: 16 }}>
            <Label>Username or Email</Label>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. inspector"
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <Label>Password</Label>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: 16 }}>
            <Button title="Sign In" onPress={handleLogin} loading={busy} disabled={!username || !password} />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceMuted },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: {
    height: 56, width: 56, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appName: { fontSize: 24, fontWeight: '800', color: Colors.darkGreen, marginTop: 10 },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.darkGreen },
  cardSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#fff',
  },
  error: { color: Colors.danger, fontSize: 13, marginTop: 10 },
});
