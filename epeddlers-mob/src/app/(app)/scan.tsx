import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api, { errorMessage } from '@/lib/api';
import { Badge, Button, Card, Muted } from '@/components/ui';
import { Colors } from '@/lib/config';

type Resolved = {
  full_name: string;
  peddler_code: string;
  application_code: string;
  permit_code: string;
  permit_status: string;
  validity: string;
  valid_from: string;
  valid_to: string;
  payment_status?: string;
  open_violations?: number;
};

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<Resolved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastRef = useRef<string | null>(null);

  async function onScanned({ data }: { data: string }) {
    if (!scanning || loading) return;
    if (lastRef.current === data) return;
    lastRef.current = data;
    setScanning(false);
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/qr/resolve', { qr_reference: data });
      setResult(res.data.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not resolve this QR code.'));
    } finally {
      setLoading(false);
    }
  }

  function rescan() {
    lastRef.current = null;
    setResult(null);
    setError(null);
    setScanning(true);
  }

  if (!permission) {
    return <View style={styles.center}><Muted>Checking camera permission…</Muted></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Camera access is required to scan peddler QR codes.</Text>
        <View style={{ height: 12 }} />
        <Button title="Grant Camera Permission" onPress={requestPermission} />
      </View>
    );
  }

  const validityTone =
    result?.validity === 'valid' ? 'success'
      : result?.validity === 'revoked' || result?.validity === 'expired' ? 'danger'
        : 'warning';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surfaceMuted }}>
      {scanning ? (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Point the camera at a peddler QR code</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {loading && <Card><Muted>Resolving…</Muted></Card>}

          {error && (
            <Card>
              <Text style={styles.errTitle}>Scan Problem</Text>
              <Muted>{error}</Muted>
            </Card>
          )}

          {result && (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.name}>{result.full_name}</Text>
                <Badge text={result.validity.replace('_', ' ')} tone={validityTone} />
              </View>
              <Muted>{result.peddler_code}</Muted>

              <View style={styles.divider} />
              <Row k="Application" v={result.application_code} />
              <Row k="Permit" v={result.permit_code} />
              <Row k="Permit Status" v={result.permit_status} />
              <Row k="Valid" v={`${result.valid_from} → ${result.valid_to}`} />
              {result.payment_status !== undefined && <Row k="Payment" v={result.payment_status} />}
              {result.open_violations !== undefined && <Row k="Open Violations" v={String(result.open_violations)} />}
            </Card>
          )}

          <Button title="Scan Again" variant="outline" onPress={rescan} />
        </ScrollView>
      )}
    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.surfaceMuted },
  msg: { textAlign: 'center', color: Colors.text },
  overlay: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' },
  overlayText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { color: Colors.textMuted, fontSize: 14 },
  v: { color: Colors.text, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  errTitle: { fontWeight: '700', color: Colors.danger, marginBottom: 4 },
});
