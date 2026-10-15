import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api, { errorMessage } from '@/lib/api';
import { Badge, Button, Card, Label, Muted } from '@/components/ui';
import { Colors } from '@/lib/config';

type Peddler = { id: number; peddler_code: string; full_name: string };
type Fee = { id: number; code: string; name: string; amount: string | null };

function peso(n: number | string | null) {
  return '\u20B1' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function Collect() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [peddlers, setPeddlers] = useState<Peddler[]>([]);
  const [selected, setSelected] = useState<Peddler | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [feeId, setFeeId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ txn_ref: string; amount: number; duplicate?: boolean } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get('/collections/fee-categories').then((r) => setFees(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounced.length < 2) {
      setPeddlers([]);
      return;
    }
    api.get('/peddlers', { params: { search: debounced, per_page: 10 } })
      .then((r) => setPeddlers(r.data.data))
      .catch(() => {});
  }, [debounced]);

  const selectedFee = fees.find((f) => f.id === feeId);

  async function collect() {
    if (!selected || !feeId) return;
    setBusy(true);
    setReceipt(null);
    try {
      // Idempotency key makes this submit safe to retry without double-charging.
      const idem = `${selected.id}:${feeId}:${Date.now()}`;
      const res = await api.post(
        '/collections',
        { peddler_id: selected.id, fee_category_id: feeId },
        { headers: { 'X-Idempotency-Key': idem } },
      );
      // Only treat as confirmed because the SERVER returned success.
      setReceipt({
        txn_ref: res.data.data.txn_ref,
        amount: res.data.data.amount,
        duplicate: res.data.data.duplicate,
      });
    } catch (err) {
      Alert.alert('Collection failed', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} style={{ backgroundColor: Colors.surfaceMuted }}>
        <Card>
          <Text style={styles.receiptTitle}>Collection Recorded</Text>
          {receipt.duplicate && <Muted>This transaction was already recorded (no double collection).</Muted>}
          <View style={styles.divider} />
          <Row k="Reference" v={receipt.txn_ref} />
          <Row k="Amount" v={peso(receipt.amount)} />
          <Row k="Peddler" v={selected?.full_name || ''} />
          <Row k="Category" v={selectedFee?.name || ''} />
        </Card>
        <Button title="New Collection" variant="outline" onPress={() => { setReceipt(null); setSelected(null); setFeeId(null); setSearch(''); }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} style={{ backgroundColor: Colors.surfaceMuted }}>
      <Card>
        <Label>Find Peddler</Label>
        <TextInput
          style={styles.input}
          placeholder="Search by name or code…"
          value={search}
          onChangeText={(t) => { setSearch(t); setSelected(null); }}
          autoCapitalize="none"
        />
        {!selected && peddlers.map((p) => (
          <Text key={p.id} style={styles.pick} onPress={() => setSelected(p)}>
            {p.full_name} · {p.peddler_code}
          </Text>
        ))}
        {selected && (
          <View style={{ marginTop: 8 }}>
            <Badge text={`${selected.full_name} · ${selected.peddler_code}`} tone="success" />
          </View>
        )}
      </Card>

      <Card>
        <Label>Collection Category</Label>
        {fees.length === 0 && <Muted>No active fee categories configured.</Muted>}
        <View style={{ gap: 8, marginTop: 6 }}>
          {fees.map((f) => (
            <Text
              key={f.id}
              onPress={() => setFeeId(f.id)}
              style={[styles.feeRow, feeId === f.id && styles.feeRowActive]}
            >
              {f.name} — {peso(f.amount)}
            </Text>
          ))}
        </View>
      </Card>

      <Muted>Amount is set by the server from the approved fee schedule. An internet connection is required.</Muted>

      <Button
        title={selectedFee ? `Collect ${peso(selectedFee.amount)}` : 'Collect'}
        onPress={collect}
        loading={busy}
        disabled={!selected || !feeId}
      />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  pick: { paddingVertical: 8, color: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.border },
  feeRow: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.text,
  },
  feeRowActive: { borderColor: Colors.primary, backgroundColor: '#eef4ea', color: Colors.darkGreen, fontWeight: '700' },
  receiptTitle: { fontSize: 18, fontWeight: '700', color: Colors.success },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { color: Colors.textMuted, fontSize: 14 },
  v: { color: Colors.text, fontWeight: '600', fontSize: 14 },
});
