import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors, Font } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Siden ble ikke funnet</Text>
      <Link href="/(auth)" style={styles.link}>Gå til startsiden</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { ...Font.h3, color: Colors.text },
  link: { ...Font.body, color: Colors.primary },
});
