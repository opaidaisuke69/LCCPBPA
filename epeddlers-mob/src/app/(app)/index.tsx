import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Button, Card, Muted, Title } from '@/components/ui';
import { Colors } from '@/lib/config';

export default function Dashboard() {
  const { user, logout, hasPermission } = useAuth();
  const router = useRouter();

  const role = user?.roles?.[0];

  const actions: { label: string; perm: string; href: string }[] = [
    { label: 'Inspection Queue', perm: 'inspections.conduct', href: '/(app)/queue' },
    { label: 'Sanitary Queue', perm: 'sanitary.conduct', href: '/(app)/queue' },
    { label: 'Scan Peddler QR', perm: 'qr.resolve', href: '/(app)/scan' },
    { label: 'Record Collection', perm: 'collections.record', href: '/(app)/collect' },
    { label: 'Record Violation', perm: 'violations.record', href: '/(app)/violations' },
  ].filter((a) => hasPermission(a.perm));

  // De-duplicate (an officer rarely has both inspection + sanitary).
  const seen = new Set<string>();
  const uniqueActions = actions.filter((a) => (seen.has(a.href) ? false : (seen.add(a.href), true)));

  return (
    <ScrollView style={{ backgroundColor: Colors.surfaceMuted }} contentContainerStyle={{ padding: 16 }}>
      <Title>Welcome, {user?.full_name?.split(' ')[0]}</Title>
      <Muted>{role?.name}</Muted>

      <View style={{ height: 16 }} />

      <Card>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {uniqueActions.map((a) => (
            <Button key={a.label + a.href} title={a.label} variant="outline" onPress={() => router.push(a.href as any)} />
          ))}
          {uniqueActions.length === 0 && <Muted>No actions available for your role.</Muted>}
        </View>
      </Card>

      <View style={{ height: 16 }} />

      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={{ marginTop: 8, gap: 4 }}>
          <Text style={styles.kv}>Username: <Text style={styles.v}>{user?.username}</Text></Text>
          <Text style={styles.kv}>Permissions: <Text style={styles.v}>{user?.permissions?.length}</Text></Text>
        </View>
        <View style={{ height: 12 }} />
        <Button title="Sign Out" variant="danger" onPress={logout} />
      </Card>

      <View style={{ height: 12 }} />
      <Muted>An internet connection is required. Financial and approval actions are confirmed by the server.</Muted>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.darkGreen },
  kv: { fontSize: 14, color: Colors.textMuted },
  v: { color: Colors.text, fontWeight: '600' },
});
