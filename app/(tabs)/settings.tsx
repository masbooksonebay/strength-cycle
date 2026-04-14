import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
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

function InfoBtn({ text, theme }: { text: string; theme: any }) {
  return (
    <TouchableOpacity onPress={() => Alert.alert("Feature Info", text)} style={styles.infoBtn}>
      <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

const PRECISION_OPTIONS = [5, 2.5, 1, 0.5, 0.25];

export default function SettingsScreen() {
  const { data, theme, updateSettings, updateLift } = useApp();
  const s = data.settings;
  const [editingRM, setEditingRM] = useState<string | null>(null);
  const [rmValue, setRmValue] = useState("");
  const [showPrecision, setShowPrecision] = useState(false);

  const startEditRM = (lift: string, current: number) => {
    setEditingRM(lift);
    setRmValue(String(current));
  };

  const saveRM = () => {
    if (editingRM && rmValue) {
      const val = parseFloat(rmValue);
      if (val > 0) updateLift(editingRM, { oneRepMax: val });
    }
    setEditingRM(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Section title="1 Rep Max" theme={theme}>
        {data.lifts.map((lift, i) => (
          <Row
            key={lift.name}
            label={lift.name}
            last={i === data.lifts.length - 1}
            theme={theme}
            right={
              editingRM === lift.name ? (
                <View style={styles.rmEdit}>
                  <TextInput
                    style={[styles.rmInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    value={rmValue} onChangeText={setRmValue} keyboardType="numeric" autoFocus onSubmitEditing={saveRM}
                  />
                  <TouchableOpacity onPress={saveRM}><Ionicons name="checkmark-circle" size={28} color={theme.accent} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEditRM(lift.name, lift.oneRepMax)}>
                  <Text style={[styles.rmValue, { color: theme.accent }]}>{lift.oneRepMax} lbs</Text>
                </TouchableOpacity>
              )
            }
          />
        ))}
      </Section>

      <Section title="Preferences" theme={theme}>
        <Row
          label="Weight Precision"
          theme={theme}
          right={
            <TouchableOpacity onPress={() => setShowPrecision(!showPrecision)}>
              <Text style={[styles.valueText, { color: theme.accent }]}>{s.weightPrecision} lbs</Text>
            </TouchableOpacity>
          }
        />
        {showPrecision && (
          <View style={[styles.precisionPicker, { borderTopColor: theme.border }]}>
            {PRECISION_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.precisionOption, s.weightPrecision === v && { backgroundColor: theme.accent }]}
                onPress={() => { updateSettings({ weightPrecision: v }); setShowPrecision(false); }}
              >
                <Text style={[styles.precisionText, { color: s.weightPrecision === v ? "#fff" : theme.text }]}>{v} lbs</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Row label="TM Percentage" theme={theme} right={<Text style={[styles.valueText, { color: theme.accent }]}>{s.tmPercentage}%</Text>} />
        <Row label="Prevent Screen Sleep" theme={theme} right={<Switch value={s.preventSleep} onValueChange={(v) => updateSettings({ preventSleep: v })} trackColor={{ true: theme.accent }} />} />
        <Row label="Rest Timer (seconds)" theme={theme} last right={<Text style={[styles.valueText, { color: theme.accent }]}>{s.restTimerDuration}s</Text>} />
      </Section>

      <Section title="Theme" theme={theme}>
        <Row label="Dark Mode" theme={theme} last right={<Switch value={s.darkMode} onValueChange={(v) => updateSettings({ darkMode: v })} trackColor={{ true: theme.accent }} />} />
      </Section>

      <Section title="Programs" theme={theme}>
        <Row label="5/3/1" theme={theme} right={<Text style={[styles.activeLabel, { color: theme.accent }]}>Active</Text>} />
        <Row label="More programs" theme={theme} last right={<View style={styles.lockedRow}><Ionicons name="lock-closed" size={14} color={theme.textSecondary} /><Text style={[styles.lockedText, { color: theme.textSecondary }]}>Coming soon</Text></View>} />
      </Section>

      <Section title="Purchase" theme={theme}>
        <Row label="PRO Bundle (all features)" theme={theme} right={<Text style={[styles.priceText, { color: theme.accent }]}>$4.99</Text>} />
        <Row
          label="Additional Lifts"
          theme={theme}
          right={
            <View style={styles.priceRow}>
              <InfoBtn text="Add unlimited custom lifts beyond the 4 main lifts. Custom lifts appear alongside your main lifts and are tracked in log and progress." theme={theme} />
              <Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>
            </View>
          }
        />
        <Row
          label="Adjustable Set"
          theme={theme}
          right={
            <View style={styles.priceRow}>
              <InfoBtn text="Add a final custom set to any lift with your own percentage and rep count. Perfect for joker sets, Boring But Big, or back-off work." theme={theme} />
              <Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>
            </View>
          }
        />
        <Row
          label="Plate Calculator"
          theme={theme}
          right={
            <View style={styles.priceRow}>
              <InfoBtn text="Shows exact plate breakdown for every set based on a standard 45 lb barbell. Plates: 45, 35, 25, 10, 5, 2.5, 1.25 lbs per side." theme={theme} />
              <Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>
            </View>
          }
        />
        <Row
          label="Progress Log"
          theme={theme}
          right={
            <View style={styles.priceRow}>
              <InfoBtn text="Unlock the Progress tab with e1RM and Training Max charts over time for every lift. Includes time filters and calendar view." theme={theme} />
              <Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>
            </View>
          }
        />
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
  rowLabel: { fontSize: 15, fontWeight: "500", flex: 1 },
  valueText: { fontSize: 15, fontWeight: "600" },
  activeLabel: { fontSize: 13, fontWeight: "700" },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lockedText: { fontSize: 13 },
  priceText: { fontSize: 14, fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoBtn: { padding: 2 },
  rmEdit: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rmInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, fontSize: 16, fontWeight: "700", width: 80, textAlign: "center" },
  rmValue: { fontSize: 16, fontWeight: "700" },
  precisionPicker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1 },
  precisionOption: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  precisionText: { fontSize: 14, fontWeight: "600" },
  version: { textAlign: "center", fontSize: 12, marginTop: spacing.md },
});
