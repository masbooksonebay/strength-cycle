import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTimer, formatTimer } from "../lib/timer";
import { useApp } from "../lib/context";
import { spacing, borderRadius } from "../constants/theme";

export function TimerPill() {
  const { theme } = useApp();
  const { seconds, running, visible, toggle, hide, adjust, reset, duration } = useTimer();
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  return (
    <>
      <View style={[styles.pillWrap]} pointerEvents="box-none">
        <TouchableOpacity style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.accent }]} onPress={() => setExpanded(true)} activeOpacity={0.85}>
          <TouchableOpacity onPress={toggle} style={styles.pillBtn}>
            <Ionicons name={running ? "pause" : "play"} size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.pillTime, { color: theme.text }]}>{formatTimer(seconds)}</Text>
          <Text style={[styles.pillLabel, { color: theme.textSecondary }]}>REST</Text>
          <TouchableOpacity onPress={hide} style={styles.pillBtn}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <Modal visible={expanded} animationType="fade" transparent onRequestClose={() => setExpanded(false)}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Rest Timer</Text>
              <TouchableOpacity onPress={() => setExpanded(false)}>
                <Ionicons name="close" size={26} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.circle, { borderColor: theme.accent }]}>
              <Text style={[styles.bigTime, { color: theme.text }]}>{formatTimer(seconds)}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>OF {formatTimer(duration)}</Text>
            </View>

            <View style={styles.adjustRow}>
              {[-30, -15, -10, 10, 15, 30].map((d) => (
                <TouchableOpacity key={d} style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(d)}>
                  <Text style={[styles.adjustText, { color: theme.text }]}>{d > 0 ? "+" : ""}{d}s</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.controlRow}>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: running ? theme.accent : theme.card, borderColor: theme.border }]} onPress={toggle}>
                <Ionicons name={running ? "pause" : "play"} size={26} color={running ? "#fff" : theme.text} />
                <Text style={[styles.controlText, { color: running ? "#fff" : theme.text }]}>{running ? "PAUSE" : "START"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={reset}>
                <Ionicons name="refresh" size={26} color={theme.text} />
                <Text style={[styles.controlText, { color: theme.text }]}>RESET</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { hide(); setExpanded(false); }} style={[styles.dismissBtn, { borderColor: theme.border }]}>
              <Text style={[styles.dismissText, { color: theme.textSecondary }]}>Dismiss Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function TimerStartButton() {
  const { theme } = useApp();
  const { visible, start } = useTimer();
  if (visible) return null;
  return (
    <TouchableOpacity onPress={() => start()} style={[styles.startBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Ionicons name="timer-outline" size={18} color={theme.accent} />
      <Text style={[styles.startBtnText, { color: theme.accent }]}>Start Rest Timer</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pillWrap: { position: "absolute", bottom: 16, left: 0, right: 0, alignItems: "center", zIndex: 50 },
  pill: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: 28, paddingVertical: 6, paddingHorizontal: 10, gap: spacing.sm, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  pillBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  pillTime: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"], minWidth: 56, textAlign: "center" },
  pillLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginLeft: -4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: spacing.md },
  card: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: "center" },
  header: { flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: "800" },
  circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  bigTime: { fontSize: 48, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },
  adjustRow: { flexDirection: "row", gap: 6, marginBottom: spacing.lg, flexWrap: "wrap", justifyContent: "center" },
  adjustBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  adjustText: { fontSize: 13, fontWeight: "600" },
  controlRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  controlBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  controlText: { fontSize: 15, fontWeight: "700" },
  dismissBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  dismissText: { fontSize: 13, fontWeight: "600" },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 8 },
  startBtnText: { fontSize: 13, fontWeight: "700" },
});
