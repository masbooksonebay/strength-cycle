import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, Alert, Modal } from "react-native";
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

function Row({ label, right, theme, last, info }: { label: string; right: React.ReactNode; theme: any; last?: boolean; info?: string }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        {info && (
          <TouchableOpacity onPress={() => Alert.alert("Feature Info", info)} style={styles.infoBtn}>
            <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {right}
    </View>
  );
}

const PRECISION_OPTIONS = [5, 2.5, 1, 0.5, 0.25];
const TM_OPTIONS = [80, 85, 90, 95, 100];

const GUIDE_TEXT = `5/3/1 is a strength training program created by Jim Wendler. It is built around four main barbell lifts and uses percentage-based loading to drive slow, consistent progress over time. The core philosophy: start lighter than you think you need to, progress slowly, and focus on long-term strength gains.

THE 4 MAIN LIFTS
• Squat
• Bench Press
• Deadlift
• Overhead Press

TRAINING MAX (TM)
Your Training Max is NOT your true 1 Rep Max. It is the weight all percentages are calculated from. Default is 90% of your 1RM. Starting conservative allows you to build momentum and avoid stalling early.

THE 4-WEEK CYCLE

Week 1 — 5/5/5+
Warm-up: 50%x5, 60%x5, 65%x5
Working sets: 75%x5, 85%x5+

Week 2 — 3/3/3+
Warm-up: 50%x5, 60%x5, 70%x5
Working sets: 80%x3, 90%x3+

Week 3 — 5/3/1+
Warm-up: 50%x5, 60%x5, 75%x5
Working sets: 85%x5, 90%x3, 95%x1+

Week 4 — Deload
Light sets: 40%x5, 50%x5, 60%x5

(x+ = AMRAP — do as many reps as possible on the final set)

TM PROGRESSION
After completing a full 4-week cycle, increase your Training Max:
• Upper body lifts (Bench, Overhead Press): +5 lbs
• Lower body lifts (Squat, Deadlift): +10 lbs

GLOSSARY
1RM (One Rep Max) — The maximum weight you can lift for one rep.
TM (Training Max) — The weight your percentages are based on. Default: 90% of your 1RM.
AMRAP — As Many Reps As Possible. On the final working set each week, do as many reps as you can with good form.
e1RM (Estimated 1RM) — A calculated estimate of your 1RM based on weight and reps, using the Epley formula: weight × (1 + reps/30).
Deload — A lighter week at the end of each 4-week cycle for recovery.
Working Sets — The main sets where the primary training stimulus occurs.
Warm-up Sets — Lighter sets before working sets to prepare the body.
Cycle — One complete 4-week block (Weeks 1–4).
TM Progression — The scheduled increase in Training Max after each completed cycle.`;

export default function SettingsScreen() {
  const { data, theme, updateSettings, updateLift } = useApp();
  const s = data.settings;
  const [editingRM, setEditingRM] = useState<string | null>(null);
  const [rmValue, setRmValue] = useState("");
  const [showPrecision, setShowPrecision] = useState(false);
  const [showTMPct, setShowTMPct] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restValue, setRestValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const startEditRM = (lift: string, current: number) => { setEditingRM(lift); setRmValue(String(current)); };
  const saveRM = () => { if (editingRM && rmValue) { const v = parseFloat(rmValue); if (v > 0) updateLift(editingRM, { oneRepMax: v }); } setEditingRM(null); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Section title="1 Rep Max" theme={theme}>
        {data.lifts.map((lift, i) => (
          <Row key={lift.name} label={lift.name} last={i === data.lifts.length - 1} theme={theme}
            right={editingRM === lift.name ? (
              <View style={styles.rmEdit}>
                <TextInput style={[styles.rmInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]} value={rmValue} onChangeText={setRmValue} keyboardType="numeric" autoFocus onSubmitEditing={saveRM} />
                <TouchableOpacity onPress={saveRM}><Ionicons name="checkmark-circle" size={28} color={theme.accent} /></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => startEditRM(lift.name, lift.oneRepMax)} style={styles.tapRow}>
                <Text style={[styles.rmValue, { color: theme.accent }]}>{lift.oneRepMax} lbs</Text>
              </TouchableOpacity>
            )} />
        ))}
      </Section>

      <Section title="Preferences" theme={theme}>
        <Row label="Weight Precision" theme={theme} right={
          <TouchableOpacity onPress={() => setShowPrecision(!showPrecision)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{s.weightPrecision} lbs</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        {showPrecision && (
          <View style={[styles.picker, { borderTopColor: theme.border }]}>
            {PRECISION_OPTIONS.map((v) => (
              <TouchableOpacity key={v} style={[styles.pickerOption, s.weightPrecision === v && { backgroundColor: theme.accent }]} onPress={() => { updateSettings({ weightPrecision: v }); setShowPrecision(false); }}>
                <Text style={[styles.pickerText, { color: s.weightPrecision === v ? "#fff" : theme.text }]}>{v} lbs</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Row label="TM Percentage" theme={theme} right={
          <TouchableOpacity onPress={() => setShowTMPct(!showTMPct)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{s.tmPercentage}%</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        {showTMPct && (
          <View style={[styles.picker, { borderTopColor: theme.border }]}>
            {TM_OPTIONS.map((v) => (
              <TouchableOpacity key={v} style={[styles.pickerOption, s.tmPercentage === v && { backgroundColor: theme.accent }]} onPress={() => { updateSettings({ tmPercentage: v }); setShowTMPct(false); }}>
                <Text style={[styles.pickerText, { color: s.tmPercentage === v ? "#fff" : theme.text }]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Row label="Prevent Screen Sleep" theme={theme} right={<Switch value={s.preventSleep} onValueChange={(v) => updateSettings({ preventSleep: v })} trackColor={{ true: theme.accent }} />} />
        <Row label="Rest Timer" theme={theme} last right={
          <TouchableOpacity onPress={() => { setRestValue(String(s.restTimerDuration)); setShowRestTimer(true); }} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{Math.floor(s.restTimerDuration / 60)}:{(s.restTimerDuration % 60).toString().padStart(2, "0")}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
      </Section>

      <Section title="Theme" theme={theme}>
        <Row label="Dark Mode" theme={theme} last right={<Switch value={s.darkMode} onValueChange={(v) => updateSettings({ darkMode: v })} trackColor={{ true: theme.accent }} />} />
      </Section>

      <Section title="Programs" theme={theme}>
        <Row label="5/3/1" theme={theme} right={<Text style={[styles.activeLabel, { color: theme.accent }]}>Active</Text>} />
        <Row label="5/3/1 Program Guide" theme={theme} right={
          <TouchableOpacity onPress={() => setShowGuide(true)} style={styles.tapRow}>
            <Ionicons name="book-outline" size={18} color={theme.textSecondary} />
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        <Row label="More programs" theme={theme} last right={<View style={styles.lockedRow}><Ionicons name="lock-closed" size={14} color={theme.textSecondary} /><Text style={[styles.lockedText, { color: theme.textSecondary }]}>Coming soon</Text></View>} />
      </Section>

      <Section title="Purchase" theme={theme}>
        <Row label="PRO Bundle (all features)" theme={theme} right={<Text style={[styles.priceText, { color: theme.accent }]}>$4.99</Text>} />
        <Row label="Additional Lifts" theme={theme} info="Add unlimited custom lifts beyond the 4 main lifts. Custom lifts appear alongside your main lifts and are tracked in log and progress." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Adjustable Set" theme={theme} info="Add a final custom set to any lift with your own percentage and rep count. Perfect for joker sets, Boring But Big, or back-off work." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Plate Calculator" theme={theme} info="Shows exact plate breakdown for every set based on a standard 45 lb barbell. Plates: 45, 35, 25, 10, 5, 2.5, 1.25, 1, 0.5, 0.25 lbs per side." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
        <Row label="Progress Log" theme={theme} info="Unlock the Progress tab with Estimated 1RM and Training Max charts over time for every lift. Includes time filters and calendar view." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
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

      {/* Rest Timer Modal */}
      <Modal visible={showRestTimer} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={[styles.miniCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.miniTitle, { color: theme.text }]}>Rest Timer (seconds)</Text>
            <TextInput style={[styles.miniInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]} value={restValue} onChangeText={setRestValue} keyboardType="numeric" autoFocus />
            <View style={styles.miniBtns}>
              <TouchableOpacity onPress={() => setShowRestTimer(false)} style={[styles.miniBtn, { borderColor: theme.border }]}><Text style={[styles.miniBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { const v = parseInt(restValue, 10); if (v > 0) updateSettings({ restTimerDuration: v }); setShowRestTimer(false); }} style={[styles.miniBtn, { backgroundColor: theme.accent }]}><Text style={[styles.miniBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5/3/1 Guide Modal */}
      <Modal visible={showGuide} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.guideContainer, { backgroundColor: theme.background }]}>
          <View style={styles.guideHeader}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>5/3/1 Program Guide</Text>
            <TouchableOpacity onPress={() => setShowGuide(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.guideContent}>
            <Text style={[styles.guideText, { color: theme.textSecondary }]}>{GUIDE_TEXT}</Text>
          </ScrollView>
        </View>
      </Modal>
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
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  infoBtn: { padding: 2 },
  tapRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  valueText: { fontSize: 15, fontWeight: "600" },
  activeLabel: { fontSize: 13, fontWeight: "700" },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lockedText: { fontSize: 13 },
  priceText: { fontSize: 14, fontWeight: "600" },
  rmEdit: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rmInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, fontSize: 16, fontWeight: "700", width: 80, textAlign: "center" },
  rmValue: { fontSize: 16, fontWeight: "700" },
  picker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1 },
  pickerOption: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pickerText: { fontSize: 14, fontWeight: "600" },
  version: { textAlign: "center", fontSize: 12, marginTop: spacing.md },
  overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  miniCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, width: "100%", maxWidth: 300 },
  miniTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md, textAlign: "center" },
  miniInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, fontSize: 24, fontWeight: "800", textAlign: "center" },
  miniBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  miniBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.sm + 4, alignItems: "center" },
  miniBtnText: { fontSize: 15, fontWeight: "600" },
  guideContainer: { flex: 1 },
  guideHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, paddingTop: 56 },
  guideTitle: { fontSize: 22, fontWeight: "800" },
  guideContent: { padding: spacing.lg },
  guideText: { fontSize: 14, lineHeight: 22 },
});
