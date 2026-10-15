import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api, { errorMessage } from '@/lib/api';
import { Badge, Button, Card, Label, Muted } from '@/components/ui';
import { Colors } from '@/lib/config';

type Peddler = { id: number; peddler_code: string; full_name: string };
type Category = { id: number; code: string; name: string };

export default function Violations() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [peddlers, setPeddlers] = useState<Peddler[]>([]);
  const [selected, setSelected] = useState<Peddler | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [catId, setCatId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [penalty, setPenalty] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get('/violations/categories').then((r) => setCats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounced.length < 2) { setPeddlers([]); return; }
    api.get('/peddlers', { params: { search: debounced, per_page: 10 } })
      .then((r) => setPeddlers(r.data.data))
      .catch(() => {});
  }, [debounced]);

  async function submit() {
    if (!catId) { Alert.alert('Required', 'Choose a violation category.'); return; }
    setBusy(true);
    try {
      await api.post('/violations', {
        category_id: catId,
        peddler_id: selected?.id,
        violation_date: new Date().toISOString().slice(0, 10),
        description,
        penalty_amount: penalty ? Number(penalty) : undefined,
      });
      Alert.alert('Recorded', 'Violation recorded.', [{ text: 'OK' }]);
      setSelected(null); setCatId(null); setDescription(''); setPenalty(''); setSearch('');
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} style={{ backgroundColor: Colors.surfaceMuted }}>
      <Card>
        <Label>Peddler (optional)</Label>
        <TextInput
          style={styles.input}
          placeholder="Search peddler…"
          value={search}
          onChangeText={(t) => { setSearch(t); setSelected(null); }}
          autoCapitalize="none"
        />
        {!selected && peddlers.map((p) => (
          <Text key={p.id} style={styles.pick} onPress={() => setSelected(p)}>
            {p.full_name} · {p.peddler_code}
          </Text>
        ))}
        {selected && <View style={{ marginTop: 8 }}><Badge text={selected.full_name} tone="info" /></View>}
      </Card>

      <Card>
        <Label>Violation Category</Label>
        <View style={{ gap: 8, marginTop: 6 }}>
          {cats.map((c) => (
            <Text key={c.id} onPress={() => setCatId(c.id)}
              style={[styles.row, catId === c.id && styles.rowActive]}>
              {c.name}
            </Text>
          ))}
        </View>

        <View style={{ height: 12 }} />
        <Label>Description</Label>
        <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} multiline value={description} onChangeText={setDescription} />

        <View style={{ height: 12 }} />
        <Label>Penalty Amount (if authorized)</Label>
        <TextInput style={styles.input} keyboardType="numeric" value={penalty} onChangeText={setPenalty} placeholder="0.00" />
      </Card>

      <Muted>Violations are recorded separately from payments. Recording a violation does not create a payment.</Muted>
      <Button title="Record Violation" onPress={submit} loading={busy} disabled={!catId} />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  pick: { paddingVertical: 8, color: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.text,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: '#eef4ea', color: Colors.darkGreen, fontWeight: '700' },
});
