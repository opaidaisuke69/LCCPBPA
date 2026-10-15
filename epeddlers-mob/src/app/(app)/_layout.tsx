import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Home, ClipboardCheck, QrCode, AlertTriangle, Coins } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { Colors } from '@/lib/config';

export default function AppLayout() {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/" />;

  const canInspect = hasPermission('inspections.conduct');
  const canSanitary = hasPermission('sanitary.conduct');
  const canCollect = hasPermission('collections.record');
  const canViolate = hasPermission('violations.record');

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.darkGreen },
        headerTintColor: '#fff',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: canSanitary && !canInspect ? 'Sanitary' : 'Inspection',
          href: canInspect || canSanitary ? '/(app)/queue' : null,
          tabBarIcon: ({ color, size }) => <ClipboardCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: hasPermission('qr.resolve') ? '/(app)/scan' : null,
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="collect"
        options={{
          title: 'Collect',
          href: canCollect ? '/(app)/collect' : null,
          tabBarIcon: ({ color, size }) => <Coins color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="violations"
        options={{
          title: 'Violations',
          href: canViolate ? '/(app)/violations' : null,
          tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size} />,
        }}
      />
      {/* Detail screens are hidden from the tab bar. */}
      <Tabs.Screen name="inspection/[id]" options={{ href: null, title: 'Inspection' }} />
      <Tabs.Screen name="sanitary/[id]" options={{ href: null, title: 'Sanitary Review' }} />
    </Tabs>
  );
}
