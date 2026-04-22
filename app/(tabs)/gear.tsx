import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import gearData from "../../data/gear.json";

export default function GearScreen() {
  const { theme } = useApp();
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { borderColor: theme.accent, backgroundColor: theme.accent + "12" }]}>
        <Text style={[styles.bannerHeading, { color: theme.accent }]}>Equipment, Lifting Accessories & Supplements</Text>
        <Text style={[styles.bannerSub, { color: theme.text }]}>Exclusive discounts coming soon.</Text>
      </View>
      {gearData.categories.map((cat) => (
        <View key={cat.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{cat.title}</Text>
          {cat.products.map((p) => (
            <TouchableOpacity key={p.brand} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.7} onPress={() => Linking.openURL(p.url)}>
              <View style={[styles.iconCircle, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="barbell-outline" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brand, { color: theme.text }]}>{p.brand}</Text>
                <Text style={[styles.productName, { color: theme.textSecondary }]}>{p.name}</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{p.description}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
          {cat.title === "Lifting Accessories" && (
            <View style={[styles.card, styles.mutedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.border }]}>
                <Ionicons name="storefront-outline" size={20} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brand, { color: theme.textSecondary }]}>Strength Cycle</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>Coming soon</Text>
                <View style={[styles.comingPill, { borderColor: theme.border }]}>
                  <Text style={[styles.comingPillText, { color: theme.textSecondary }]}>Coming Soon</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      ))}
      <Text style={[styles.disclosure, { color: theme.textSecondary }]}>{gearData.disclosure}</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  banner: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  bannerHeading: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  bannerSub: { fontSize: 13, lineHeight: 19 },
  disclosure: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, gap: spacing.sm + 2 },
  mutedCard: { opacity: 0.75 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 15, fontWeight: "700" },
  productName: { fontSize: 12, marginTop: 1 },
  description: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  comingPill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  comingPillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
});
