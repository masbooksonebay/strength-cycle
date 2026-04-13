import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import gearData from "../../data/gear.json";

interface Product {
  brand: string;
  name: string;
  description: string;
  url: string;
  image: string;
}

interface Category {
  title: string;
  products: Product[];
}

export default function GearScreen() {
  const { theme } = useApp();
  const categories: Category[] = gearData.categories;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.disclosure, { color: theme.textSecondary, borderColor: theme.border }]}>
        {gearData.disclosure}
      </Text>

      {categories.map((cat) => (
        <View key={cat.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{cat.title}</Text>
          {cat.products.map((product) => (
            <TouchableOpacity
              key={product.brand}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(product.url)}
            >
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: theme.inputBg }]}>
                  <Ionicons name="barbell-outline" size={28} color={theme.textSecondary} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={[styles.brand, { color: theme.text }]}>{product.brand}</Text>
                <Text style={[styles.productName, { color: theme.textSecondary }]}>{product.name}</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{product.description}</Text>
                <View style={[styles.shopBtn, { backgroundColor: theme.accent }]}>
                  <Text style={styles.shopBtnText}>
                    {product.url.includes("amazon.com") ? "Shop on Amazon" : "Visit Store"}
                  </Text>
                  <Ionicons name="open-outline" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  disclosure: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm + 4,
  },
  productImage: {
    width: "100%",
    height: 120,
  },
  imagePlaceholder: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: spacing.md,
  },
  brand: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
  },
  shopBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
