import { StyleSheet, View } from "react-native";

export function SheetBackdrop({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <View style={styles.backdrop} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.4)" },
});
