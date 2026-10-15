import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { errorMessage } from '@/lib/api';
import { Button, Card, Label, Muted } from '@/components/ui';
import { Colors } from '@/lib/config';

type App = {
  id: number; application_code: string; applicant_name: string;
  business_name: string | null; goods_type: string | null;
  contact_number: string | null; address: string | null; status: string;
};

const RECS = [
  { key: 'approve', label: 'Approve', tone: Colors.success },
  { key: 'reject', label: 'Reject', tone: Colors.danger },
  { key: 'return', label: 'Return', tone: Colors.warning },
] as const;

export default function InspectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<'compliant' | 'non_compliant' | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [findings, setFindings] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/applications/${id}`);
        setApp(res.data.data);
      } catch (err) {
        Alert.alert('Error', errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function submit() {
    if (!recommendation) {
      Alert.alert('Required', 'Please choose a recommendation.');
      return;
    }
    setBusy(true);
    try {
      const created = await api.post('/inspections', {
        application_id: Number(id),
        compliance,
        recommendation,
        findings,
        remarks,
      });
      await api.post(`/inspections/${created.data.data.id}/submit`, {});
      Alert.alert('Submitted', 'Inspection result recorded.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><Muted>Loading…</Muted></View>;
  }
  if (!app) {
    return <View style={styles.center}><Muted>Application not found.</Muted></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: Colors.surfaceMuted }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card>
        <Text style={styles.code}>{app.application_code}</Text>
        <Text style={styles.name}>{app.applicant_name}</Text>
        <Muted>{app.business_name || '—'} · {app.goods_type || '—'}</Muted>
        <Muted>{app.contact_number || ''} {app.address ? `· ${app.address}` : ''}</Muted>
      </Card>

      <Card>
        <Label>Compliance</Label>
        <View style={styles.rowBtns}>
          {(['compliant', 'non_compliant'] as const).map((c) => (
            <SelectChip key={c} active={compliance === c} label={c.replace('_', ' ')} onPress={() => setCompliance(c)} />
          ))}
        </View>

        <View style={{ height: 12 }} />
        <Label>Recommendation</Label>
        <View style={styles.rowBtns}>
          {RECS.map((r) => (
            <SelectChip key={r.key} active={recommendation === r.key} label={r.label} color={r.tone} onPress={() => setRecommendation(r.key)} />
          ))}
        </View>

        <View style={{ height: 12 }} />
        <Label>Findings</Label>
        <TextInput style={styles.input} multiline value={findings} onChangeText={setFindings} placeholder="Observations…" />

        <View style={{ height: 12 }} />
        <Label>Remarks / Recommendation note</Label>
        <TextInput style={styles.input} multiline value={remarks} onChangeText={setRemarks} />
      </Card>

      <Button title="Submit Inspection" onPress={submit} loading={busy} />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function SelectChip({ active, label, color, onPress }: { active: boolean; label: string; color?: string; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: color || Colors.primary, borderColor: color || Colors.primary, color: '#fff' },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceMuted },
  code: { fontFamily: 'monospace', fontSize: 12, color: Colors.textMuted },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 2 },
  rowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, color: Colors.text, textTransform: 'capitalize', overflow: 'hidden',
  },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10,
    minHeight: 60, backgroundColor: '#fff', textAlignVertical: 'top',
  },
});
