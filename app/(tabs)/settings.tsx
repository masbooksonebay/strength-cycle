import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { MAIN_LIFTS } from "../../lib/program";
import { spacing, borderRadius } from "../../constants/theme";
import { useState } from "react";

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function Row({ label, right, theme, last }: { label: string; right: React.ReactNode; theme: any; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { data, theme, updateSettings, updateLift } = useApp();
  const s = data.settings;
  const [editingTM, setEditingTM] = useState<string | null>(null);
  const [tmValue, setTmValue] = useState("");

  const startEditTM = (lift: string, current: number) => {
    setEditingTM(lift);
    setTmValue(String(current));
  };

  const saveTM = () => {
    if (editingTM && tmValue) {
      const val = parseFloat(tmValue);
      if (val > 0) updateLift(editingTM, { trainingMax: val });
    }
    setEditingTM(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Section title="Training Maxes" theme={theme}>
        {data.lifts.map((lift, i) => (
          <Row
            key={lift.name}
            label={lift.name}
            last={i === data.lifts.length - 1}
            theme={theme}
            right={
              editingTM === lift.name ? (
                <View style={styles.tmEdit}>
                  <TextInput
                    style={[styles.tmInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    value={tmValue}
                    onChangeText={setTmValue}
                    keyboardType="numeric"
                    autoFocus
                    onSubmitEditing={saveTM}
                  />
                  <TouchableOpacity onPress={saveTM}>
                    <Ionicons name="checkmark-circle" size={28} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEditTM(lift.name, lift.trainingMax)}>
                  <Text style={[styles.tmValue, { color: theme.accent }]}>{lift.trainingMax} lbs</Text>
                </TouchableOpacity>
              )
            }
          />
        ))}
      </Section>

      <Section title="Behaviour" theme={theme}>
        <Row
          label="Weight Precision"
          theme={theme}
          right={
            <View style={styles.toggleRow}>
              {[2.5, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.toggleBtn, s.weightPrecision === v && { backgroundColor: theme.accent }]}
                  onPress={() => updateSettings({ weightPrecision: v })}
                >
                  <Text style={[styles.toggleText, { color: s.weightPrecision === v ? "#fff" : theme.text }]}>{v} lbs</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
        />
        <Row
          label="TM Percentage"
          theme={theme}
          right={<Text style={[styles.valueText, { color: theme.accent }]}>{s.tmPercentage}%</Text>}
        />
        <Row
          label="Prevent Screen Sleep"
          theme={theme}
          right={
            <Switch
              value={s.preventSleep}
              onValueChange={(v) => updateSettings({ preventSleep: v })}
              trackColor={{ true: theme.accent }}
            />
          }
        />
        <Row
          label="Rest Timer (seconds)"
          theme={theme}
          last
          right={<Text style={[styles.valueText, { color: theme.accent }]}>{s.restTimerDuration}s</Text>}
        />
      </Section>

      <Section title="Theme" theme={theme}>
        <Row
          label="Dark Mode"
          theme={theme}
          last
          right={
            <Switch
              value={s.darkMode}
              onValueChange={(v) => updateSettings({ darkMode: v })}
              trackColor={{ true: theme.accent }}
            />
          }
        />
      </Section>

      <Section title="Programs" theme={theme}>
        <Row label="5/3/1" theme={theme} right={<Text style={[styles.activeLabel, { color: theme.accent }]}>Active</Text>} />
        <Row
          label="More programs"
          theme={theme}
          last
          right={
            <View style={styles.lockedRow}>
              <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
              <Text style={[styles.lockedText, { color: theme.textSecondary }]}>Coming soon</Text>
            </View>
          }
        />
      </Section>

      <Section title="Purchase" theme={theme}>
        <Row
          label="PRO Bundle (all features)"
          theme={theme}
          right={<Text style={[styles.priceText, { color: theme.accent }]}>$4.99</Text>}
        />
        <Row label="Additional Exercises" theme={theme} right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Adjustable Set" theme={theme} right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Plate Calculator" theme={theme} right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Progress Log" theme={theme} right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Restore Purchases" theme={theme} last right={<Ionicons name="refresh" size={18} color={theme.textSecondary} />} />
      </Section>

      <Section title="Feedback" theme={theme}>
        <Row label="Send Feedback" theme={theme} right={<Ionicons name="mail-outline" size={18} color={theme.textSecondary} />} />
        <Row label="Rate the App" theme={theme} last right={<Ionicons name="star-outline" size={18} color={theme.textSecondary} />} />
      </Section>

      <Section title="Data" theme={theme}>
        <Row label="Backup Data" theme={theme} right={<Ionicons name="download-outline" size={18} color={theme.textSecondary} />} />
        <Row label="Restore Data" theme={theme} last right={<Ionicons name="push-outline" size={18} color={theme.textSecondary} />} />
      </Section>

      <Text style={[styles.version, { color: theme.textSecondary }]}>Strength Cycle v1.0.0</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, paddingLeft: spacing.xs },
  sectionCard: { borderRadius: borderRadius.md, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  valueText: { fontSize: 15, fontWeight: "600" },
  toggleRow: { flexDirection: "row", borderRadius: borderRadius.sm, overflow: "hidden" },
  toggleBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggleText: { fontSize: 13, fontWeight: "600" },
  activeLabel: { fontSize: 13, fontWeight: "700" },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lockedText: { fontSize: 13 },
  priceText: { fontSize: 14, fontWeight: "600" },
  tmEdit: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tmInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, fontSize: 16, fontWeight: "700", width: 80, textAlign: "center" },
  tmValue: { fontSize: 16, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: spacing.md },
});
