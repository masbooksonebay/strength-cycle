import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Vibration, TextInput, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export default function TimerScreen() {
  const { data, theme, updateSettings } = useApp();
  const defaultDuration = data.settings.restTimerDuration;
  const [seconds, setSeconds] = useState(defaultDuration);
  const [running, setRunning] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editValue, setEditValue] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { setRunning(false); Vibration.vibrate([0, 500, 200, 500]); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const adjust = (delta: number) => setSeconds((s) => Math.max(0, s + delta));

  const openEdit = () => {
    setEditValue(String(seconds));
    setEditModal(true);
  };

  const saveEdit = () => {
    const val = parseInt(editValue, 10);
    if (val > 0) {
      setSeconds(val);
      updateSettings({ restTimerDuration: val });
    }
    setEditModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={[styles.circle, { borderColor: theme.accent }]} onPress={openEdit} activeOpacity={0.7}>
        <Text style={[styles.time, { color: theme.text }]}>{display}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>REST TIMER</Text>
      </TouchableOpacity>

      <View style={styles.adjustRow}>
        {[-30, -15, -10, 10, 15, 30].map((d) => (
          <TouchableOpacity key={d} style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(d)}>
            <Text style={[styles.adjustText, { color: theme.text }]}>{d > 0 ? "+" : ""}{d}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.controlRow}>
        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: running ? theme.accent : theme.card, borderColor: theme.border }]} onPress={() => setRunning(!running)}>
          <Ionicons name={running ? "pause" : "play"} size={28} color={running ? "#fff" : theme.text} />
          <Text style={[styles.controlText, { color: running ? "#fff" : theme.text }]}>{running ? "STOP" : "START"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => { setRunning(false); setSeconds(defaultDuration); }}>
          <Ionicons name="refresh" size={28} color={theme.text} />
          <Text style={[styles.controlText, { color: theme.text }]}>RESET</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.tip, { color: theme.textSecondary }]}>Tap the timer to set an exact duration</Text>

      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.editOverlay}>
          <View style={[styles.editCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.editTitle, { color: theme.text }]}>Set Rest Timer (seconds)</Text>
            <TextInput style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]} value={editValue} onChangeText={setEditValue} keyboardType="numeric" autoFocus />
            <View style={styles.editBtns}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={[styles.editBtn, { borderColor: theme.border }]}><Text style={[styles.editBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.editBtn, { backgroundColor: theme.accent }]}><Text style={[styles.editBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  circle: { width: 220, height: 220, borderRadius: 110, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  time: { fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 2, marginTop: 4 },
  adjustRow: { flexDirection: "row", gap: spacing.xs + 2, marginBottom: spacing.xl, flexWrap: "wrap", justifyContent: "center" },
  adjustBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  adjustText: { fontSize: 13, fontWeight: "600" },
  controlRow: { flexDirection: "row", gap: spacing.md },
  controlBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  controlText: { fontSize: 16, fontWeight: "700" },
  tip: { fontSize: 12, marginTop: spacing.xl, textAlign: "center" },
  editOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  editCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, width: "100%", maxWidth: 300 },
  editTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md, textAlign: "center" },
  editInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, fontSize: 24, fontWeight: "800", textAlign: "center" },
  editBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  editBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.sm + 4, alignItems: "center" },
  editBtnText: { fontSize: 15, fontWeight: "600" },
});
