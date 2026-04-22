import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { techniqueForLift } from "../../constants/programContent";

interface Props {
  visible: boolean;
  liftName: string;
  onClose: () => void;
}

export function TechniqueTipsModal({ visible, liftName, onClose }: Props) {
  const { theme } = useApp();
  const content = techniqueForLift(liftName);
  const body = { color: theme.text, opacity: 0.88 };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              {liftName.toUpperCase()} <Text style={{ color: theme.textSecondary }}>— Technique Tips</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close technique tips" hitSlop={12}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!content ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No technique tips available for {liftName}.
            </Text>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.accent }]}>SETUP</Text>
              {content.setup.map((s, i) => (
                <Text key={`setup-${i}`} style={[styles.bullet, body]}>•  {s}</Text>
              ))}

              <Text style={[styles.label, { color: theme.accent }]}>EXECUTION</Text>
              {content.execution.map((s, i) => (
                <Text key={`exec-${i}`} style={[styles.bullet, body]}>•  {s}</Text>
              ))}

              <Text style={[styles.label, { color: theme.accent }]}>COMMON MISTAKES</Text>
              {content.mistakes.map((s, i) => (
                <Text key={`mistakes-${i}`} style={[styles.bullet, body]}>•  {s}</Text>
              ))}

              <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
                Educational content only. Consult a qualified coach for personalized form feedback.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs },
  bullet: { fontSize: 14, lineHeight: 22, paddingLeft: 4 },
  empty: { fontSize: 14, textAlign: "center", marginTop: spacing.xl },
  disclaimer: { fontSize: 12, fontStyle: "italic", marginTop: spacing.lg, opacity: 0.75 },
});
