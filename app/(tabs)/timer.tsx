import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export default function TimerScreen() {
  const { data, theme } = useApp();
  const defaultDuration = data.settings.restTimerDuration;
  const [seconds, setSeconds] = useState(defaultDuration);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;
  const progress = defaultDuration > 0 ? seconds / defaultDuration : 0;

  const adjust = (delta: number) => {
    setSeconds((s) => Math.max(0, s + delta));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Timer circle */}
      <View style={[styles.circle, { borderColor: theme.accent }]}>
        <Text style={[styles.time, { color: theme.text }]}>{display}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>REST TIMER</Text>
      </View>

      {/* Adjust buttons */}
      <View style={styles.adjustRow}>
        <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(-30)}>
          <Text style={[styles.adjustText, { color: theme.text }]}>-30s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(-15)}>
          <Text style={[styles.adjustText, { color: theme.text }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(15)}>
          <Text style={[styles.adjustText, { color: theme.text }]}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.border }]} onPress={() => adjust(30)}>
          <Text style={[styles.adjustText, { color: theme.text }]}>+30s</Text>
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: running ? theme.accent : theme.card, borderColor: theme.border }]}
          onPress={() => setRunning(!running)}
        >
          <Ionicons name={running ? "pause" : "play"} size={28} color={running ? "#fff" : theme.text} />
          <Text style={[styles.controlText, { color: running ? "#fff" : theme.text }]}>{running ? "STOP" : "START"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            setRunning(false);
            setSeconds(defaultDuration);
          }}
        >
          <Ionicons name="refresh" size={28} color={theme.text} />
          <Text style={[styles.controlText, { color: theme.text }]}>RESET</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.tip, { color: theme.textSecondary }]}>
        Default: {Math.floor(defaultDuration / 60)}:{(defaultDuration % 60).toString().padStart(2, "0")} &middot; Change in Settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  circle: { width: 220, height: 220, borderRadius: 110, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  time: { fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 2, marginTop: 4 },
  adjustRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  adjustBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  adjustText: { fontSize: 14, fontWeight: "600" },
  controlRow: { flexDirection: "row", gap: spacing.md },
  controlBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  controlText: { fontSize: 16, fontWeight: "700" },
  tip: { fontSize: 12, marginTop: spacing.xl, textAlign: "center" },
});
