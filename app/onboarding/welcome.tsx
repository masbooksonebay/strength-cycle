import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

const ICON_SIZE = 120;

export default function Welcome() {
  const { theme } = useApp();
  const router = useRouter();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topSpacer} />
      <View style={styles.body}>
        <Image
          source={require("../../assets/app-icon-mark.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.headingBlock}>
          <Text style={[styles.lineWelcome, { color: theme.text }]}>Welcome</Text>
          <Text style={[styles.lineTo, { color: theme.textSecondary }]}>to</Text>
          <Text style={[styles.lineBrand, { color: theme.accent }]}>Strength Cycle</Text>
        </View>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Let&apos;s get your program set up. Pick a methodology and enter your current lifts — you can change either anytime in Settings.
        </Text>
      </View>
      <View style={styles.bottomSpacer} />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/onboarding")}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSpacer: { flex: 1 },
  bottomSpacer: { flex: 2.5 },
  body: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginBottom: 40,
  },
  headingBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  lineWelcome: {
    fontSize: 32,
    fontWeight: "500",
    lineHeight: 36,
    textAlign: "center",
  },
  lineTo: {
    fontSize: 18,
    fontWeight: "300",
    lineHeight: 24,
    textAlign: "center",
    marginVertical: 2,
  },
  lineBrand: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  sub: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 28,
  },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
