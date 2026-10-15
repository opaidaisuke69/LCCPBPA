import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import api, { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, EmptyState, Muted } from '@/components/ui';
import { Colors } from '@/lib/config';

type AppRow = {
  id: number; application_code: string; applicant_name: string;
  business_name: string | null; goods_type: string | null; type: string;
};

export default function Queue() {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const sanitaryMode = hasPermission('sanitary.conduct') && !hasPermission('inspections.conduct');
  const endpoint = sanitaryMode ? '/sanitary-inspections' : '/inspections';
  const detailBase = sanitaryMode ? '/(app)/sanitary' : '/(app)/inspection';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(endpoint, { params: { search: debounced, per_page: 50 } });
        setItems(res.data.data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [endpoint, debounced],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surfaceMuted }}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by Application ID or name..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : error ? (
        <View style={{ padding: 16 }}><Text style={{ color: Colors.danger }}>{error}</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<EmptyState title="Queue is empty" hint="No applications awaiting review." />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`${detailBase}/${item.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.application_code}</Text>
                <Text style={styles.name}>{item.applicant_name}</Text>
                <Muted>{item.business_name || '—'} · {item.goods_type || '—'}</Muted>
              </View>
              <Badge text={item.type} tone="info" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14,
  },
  code: { fontFamily: 'monospace', fontSize: 12, color: Colors.textMuted },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 2 },
});
