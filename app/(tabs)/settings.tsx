import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { PROGRAMS } from "../../lib/programs";
import { spacing, borderRadius } from "../../constants/theme";
import { useEffect, useState } from "react";
import { buildSampleWorkouts, SAMPLE_DATA_ENABLED_KEY } from "../../lib/sampleData";
import {
  BAR_PRESETS,
  DEFAULT_PLATES_LB,
  DEFAULT_PLATES_KG,
  PRECISION_OPTIONS_LB,
  PRECISION_OPTIONS_KG,
  RoundingMode,
  WeightUnit,
  formatWeight,
} from "../../lib/plates";
import { SHOW_IAP_UI } from "../../lib/config";
import { ProgramGuide } from "../../components/ProgramGuide";
import { NumericInputWithDone } from "../../components/common/NumericInputWithDone";
import { SheetBackdrop } from "../../components/common/SheetBackdrop";

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function Row({ label, right, theme, last, info, onPress }: { label: string; right: React.ReactNode; theme: any; last?: boolean; info?: string; onPress?: () => void }) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  const wrapProps = onPress ? { onPress, activeOpacity: 0.6 } : {};
  return (
    <Wrap {...wrapProps} style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        {info && (
          <TouchableOpacity onPress={() => Alert.alert("Feature Info", info)} style={styles.infoBtn}>
            <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {right}
    </Wrap>
  );
}

function DeveloperSection() {
  const { data, theme, replaceSampleWorkouts, clearSampleWorkouts } = useApp();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SAMPLE_DATA_ENABLED_KEY).then((v) => {
      if (v === "1") setEnabled(true);
    });
  }, []);

  const persistEnabled = async (next: boolean) => {
    setEnabled(next);
    await AsyncStorage.setItem(SAMPLE_DATA_ENABLED_KEY, next ? "1" : "0");
  };

  const onToggle = (next: boolean) => {
    if (next) {
      const samples = buildSampleWorkouts(data.settings.precision, data.settings.rounding);
      replaceSampleWorkouts(samples);
      persistEnabled(true);
      Alert.alert("Sample data loaded", "Sample data loaded. Check Track → Progress to see charts populate.");
    } else {
      Alert.alert(
        "Clear sample data?",
        "Clear all sample data? This will not affect any real workout history.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setEnabled(true) },
          {
            text: "OK",
            style: "destructive",
            onPress: () => {
              clearSampleWorkouts();
              persistEnabled(false);
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.accent }]}>DEVELOPER</Text>
      <Text style={[styles.devSubtitle, { color: theme.textSecondary }]}>(dev builds only)</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Load Sample Data</Text>
            <Text style={[styles.devDesc, { color: theme.textSecondary }]}>
              Seeds 12 cycles of sample workout data to test Progress tab charts. Toggle off to clear all seeded data.
            </Text>
          </View>
          <Switch value={enabled} onValueChange={onToggle} trackColor={{ true: theme.accent }} />
        </View>
      </View>
    </View>
  );
}

const TM_OPTIONS = [80, 85, 90, 95, 100];

const ROUNDING_LABELS: Record<RoundingMode, string> = {
  down: "Always down",
  nearest: "Nearest",
  up: "Always up",
};

export default function SettingsScreen() {
  const { data, theme, updateSettings, updateLift, changeUnits } = useApp();
  const router = useRouter();
  const s = data.settings;
  const activeProgramName = PROGRAMS[data.activeProgram].displayName;
  const unitLabel = s.units === "lb" ? "lbs" : "kg";
  const [editingRM, setEditingRM] = useState<string | null>(null);
  const [rmValue, setRmValue] = useState("");
  const [showPrecision, setShowPrecision] = useState(false);
  const [showTMPct, setShowTMPct] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restValue, setRestValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showBarWeight, setShowBarWeight] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [customBarVal, setCustomBarVal] = useState("");

  const startEditRM = (lift: string, current: number) => { setEditingRM(lift); setRmValue(String(current)); };
  const saveRM = () => { if (editingRM && rmValue) { const v = parseFloat(rmValue); if (v > 0) updateLift(editingRM, { oneRepMax: v }); } setEditingRM(null); };

  const handleSendFeedback = () => {
    const email = "strengthcyclestudios@gmail.com";
    const subject = encodeURIComponent("Strength Cycle Feedback");
    Linking.openURL(`mailto:${email}?subject=${subject}`);
  };

  const handleRateApp = async () => {
    try {
      if (await StoreReview.hasAction()) {
        StoreReview.requestReview();
      }
    } catch {}
  };

  const onUnitsChange = (next: WeightUnit) => {
    if (next === s.units) return;
    Alert.alert(
      `Switch to ${next}?`,
      "All stored weights will be converted to the nearest loadable value in the new unit.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Switch", onPress: () => changeUnits(next) },
      ],
    );
  };

  const precisionOptions = s.units === "lb" ? PRECISION_OPTIONS_LB : PRECISION_OPTIONS_KG;
  const defaultPlates = s.units === "lb" ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG;
  const barPresets = BAR_PRESETS[s.units];
  const currentBarPresetLabel = barPresets.find((p) => p.weight === s.barWeight)?.label || `Custom (${formatWeight(s.barWeight)})`;

  const togglePlate = (p: number) => {
    const has = s.availablePlates.includes(p);
    const next = has ? s.availablePlates.filter((x) => x !== p) : [...s.availablePlates, p];
    next.sort((a, b) => b - a);
    updateSettings({ availablePlates: next });
  };

  const setBar = (w: number) => {
    updateSettings({ barWeight: w });
    setShowBarWeight(false);
  };

  const applyCustomBar = () => {
    const v = parseFloat(customBarVal);
    if (v > 0) {
      setBar(v);
      setCustomBarVal("");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Section title="General" theme={theme}>
        <Row label="Units" theme={theme} last right={
          <View style={styles.unitToggle}>
            {(["lb", "kg"] as const).map((u) => (
              <TouchableOpacity key={u} onPress={() => onUnitsChange(u)} style={[styles.unitBtn, s.units === u && { backgroundColor: theme.accent, borderColor: theme.accent }, { borderColor: theme.border }]}>
                <Text style={[styles.unitBtnText, { color: s.units === u ? "#fff" : theme.text }]}>{u.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        } />
      </Section>

      <Section title="1 Rep Max" theme={theme}>
        {data.lifts.map((lift, i) => (
          <Row key={lift.name} label={lift.name} last={i === data.lifts.length - 1} theme={theme}
            right={editingRM === lift.name ? (
              <View style={styles.rmEdit}>
                <NumericInputWithDone style={[styles.rmInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]} value={rmValue} onChangeText={setRmValue} keyboardType="numeric" autoFocus onSubmitEditing={saveRM} />
                <TouchableOpacity onPress={saveRM}><Ionicons name="checkmark-circle" size={28} color={theme.accent} /></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => startEditRM(lift.name, lift.oneRepMax)} style={styles.tapRow}>
                <Text style={[styles.rmValue, { color: theme.accent }]}>{lift.oneRepMax} {unitLabel}</Text>
              </TouchableOpacity>
            )} />
        ))}
      </Section>

      <Section title="Plate Calculator" theme={theme}>
        <Row label="Bar Weight" theme={theme} right={
          <TouchableOpacity onPress={() => setShowBarWeight(true)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{currentBarPresetLabel} · {formatWeight(s.barWeight)} {unitLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        <Row label="Available Plates" theme={theme} right={
          <TouchableOpacity onPress={() => setShowPlates(true)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{s.availablePlates.length} selected</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        <Row label="Precision" theme={theme} last right={
          <TouchableOpacity onPress={() => setShowPrecision(!showPrecision)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{formatWeight(s.precision)} {unitLabel} · {ROUNDING_LABELS[s.rounding]}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        {showPrecision && (
          <View style={[styles.pickerPane, { borderTopColor: theme.border }]}>
            <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>INCREMENT</Text>
            <View style={styles.picker}>
              {precisionOptions.map((v) => (
                <TouchableOpacity key={v} style={[styles.pickerOption, s.precision === v && { backgroundColor: theme.accent }, { borderColor: theme.border }]} onPress={() => updateSettings({ precision: v })}>
                  <Text style={[styles.pickerText, { color: s.precision === v ? "#fff" : theme.text }]}>{formatWeight(v)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.pickerLabel, { color: theme.textSecondary, marginTop: spacing.md }]}>ROUNDING DIRECTION</Text>
            <View style={styles.picker}>
              {(["down", "nearest", "up"] as const).map((m) => (
                <TouchableOpacity key={m} style={[styles.pickerOption, s.rounding === m && { backgroundColor: theme.accent }, { borderColor: theme.border }]} onPress={() => updateSettings({ rounding: m })}>
                  <Text style={[styles.pickerText, { color: s.rounding === m ? "#fff" : theme.text }]}>{ROUNDING_LABELS[m]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Section>

      <Section title="Preferences" theme={theme}>
        <Row label="TM Percentage" theme={theme} right={
          <TouchableOpacity onPress={() => setShowTMPct(!showTMPct)} style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{s.tmPercentage}%</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        } />
        {showTMPct && (
          <View style={[styles.picker, { borderTopColor: theme.border, padding: spacing.md, borderTopWidth: 1 }]}>
            {TM_OPTIONS.map((v) => (
              <TouchableOpacity key={v} style={[styles.pickerOption, s.tmPercentage === v && { backgroundColor: theme.accent }, { borderColor: theme.border }]} onPress={() => { updateSettings({ tmPercentage: v }); setShowTMPct(false); }}>
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
        <Row label="Active Program" theme={theme} onPress={() => router.push("/settings/program-switcher")} right={
          <View style={styles.tapRow}>
            <Text style={[styles.valueText, { color: theme.accent }]}>{activeProgramName}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </View>
        } />
        <Row label="5/3/1 Program Guide" theme={theme} last onPress={() => setShowGuide(true)} right={
          <View style={styles.tapRow}>
            <Ionicons name="book-outline" size={18} color={theme.textSecondary} />
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </View>
        } />
      </Section>

      {SHOW_IAP_UI && (
        <Section title="Purchase" theme={theme}>
          <Row label="PRO Bundle (all features)" theme={theme} right={<Text style={[styles.priceText, { color: theme.accent }]}>$4.99</Text>} />
          <Row label="Additional Lifts" theme={theme} info="Add unlimited custom lifts beyond the 4 main lifts. Custom lifts appear alongside your main lifts and are tracked in log and progress." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
          <Row label="Adjustable Set" theme={theme} info="Add a final custom set to any lift with your own percentage and rep count. Perfect for joker sets, Boring But Big, or back-off work." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
          <Row label="Progress Log" theme={theme} info="Unlock the Progress tab with Estimated 1RM and Training Max charts over time for every lift. Includes time filters and calendar view." right={<Text style={[styles.priceText, { color: theme.textSecondary }]}>$1.99</Text>} />
          <Row label="Restore Purchases" theme={theme} last right={<Ionicons name="refresh" size={18} color={theme.textSecondary} />} />
        </Section>
      )}

      <Section title="Feedback" theme={theme}>
        <Row label="Send Feedback" theme={theme} onPress={handleSendFeedback} right={<Ionicons name="mail-outline" size={18} color={theme.textSecondary} />} />
        <Row label="Rate the App" theme={theme} last onPress={handleRateApp} right={<Ionicons name="star-outline" size={18} color={theme.textSecondary} />} />
      </Section>

      <Section title="Data" theme={theme}>
        <Row label="Backup Data" theme={theme} right={<Ionicons name="download-outline" size={18} color={theme.textSecondary} />} />
        <Row label="Restore Data" theme={theme} last right={<Ionicons name="push-outline" size={18} color={theme.textSecondary} />} />
      </Section>

      {__DEV__ && <DeveloperSection />}

      <Text style={[styles.version, { color: theme.textSecondary }]}>Strength Cycle v1.0.0</Text>
      <View style={{ height: 40 }} />

      {/* Rest Timer Modal */}
      <Modal visible={showRestTimer} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowRestTimer(false)}>
        <KeyboardAvoidingView style={[styles.guideContainer, { backgroundColor: theme.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.guideHeader}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>Rest Timer</Text>
            <TouchableOpacity onPress={() => setShowRestTimer(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.guideContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Default duration in seconds for the rest timer between sets.</Text>
            <NumericInputWithDone style={[styles.miniInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]} value={restValue} onChangeText={setRestValue} keyboardType="numeric" autoFocus />
            <View style={styles.miniBtns}>
              <TouchableOpacity onPress={() => setShowRestTimer(false)} style={[styles.miniBtn, { borderColor: theme.border }]}><Text style={[styles.miniBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { const v = parseInt(restValue, 10); if (v > 0) updateSettings({ restTimerDuration: v }); setShowRestTimer(false); }} style={[styles.miniBtn, { backgroundColor: theme.accent }]}><Text style={[styles.miniBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bar Weight Modal */}
      <Modal visible={showBarWeight} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.guideContainer, { backgroundColor: theme.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.guideHeader}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>Bar Weight</Text>
            <TouchableOpacity onPress={() => setShowBarWeight(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.guideContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            {barPresets.map((p) => (
              <TouchableOpacity key={p.label} style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setBar(p.weight)}>
                <Text style={[styles.listRowLabel, { color: theme.text }]}>{p.label}</Text>
                <View style={styles.tapRow}>
                  <Text style={[styles.valueText, { color: theme.accent }]}>{formatWeight(p.weight)} {unitLabel}</Text>
                  {s.barWeight === p.weight && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                </View>
              </TouchableOpacity>
            ))}
            <Text style={[styles.pickerLabel, { color: theme.textSecondary, marginTop: spacing.md }]}>CUSTOM</Text>
            <View style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <NumericInputWithDone
                style={[styles.customInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                value={customBarVal}
                onChangeText={setCustomBarVal}
                placeholder={`e.g. ${s.units === "lb" ? "35" : "15"}`}
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={applyCustomBar} style={[styles.applyBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Set</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Plates Modal */}
      <Modal visible={showPlates} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.guideContainer, { backgroundColor: theme.background }]}>
          <View style={styles.guideHeader}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>Available Plates</Text>
            <TouchableOpacity onPress={() => setShowPlates(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.guideContent}>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Toggle the plates you own. Disabled plates won't be used in the calculator.</Text>
            {defaultPlates.map((p) => {
              const enabled = s.availablePlates.includes(p);
              return (
                <TouchableOpacity key={p} style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => togglePlate(p)}>
                  <Text style={[styles.listRowLabel, { color: theme.text }]}>{formatWeight(p)} {unitLabel}</Text>
                  <Switch value={enabled} onValueChange={() => togglePlate(p)} trackColor={{ true: theme.accent }} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            <ProgramGuide theme={theme} />
          </ScrollView>
        </View>
      </Modal>

      <SheetBackdrop visible={showRestTimer || showBarWeight || showPlates || showGuide} />
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
  pickerPane: { padding: spacing.md, borderTopWidth: 1 },
  pickerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: spacing.sm },
  picker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pickerOption: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1 },
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
  guideHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  guideTitle: { fontSize: 22, fontWeight: "800" },
  guideContent: { padding: spacing.lg },
  guideText: { fontSize: 14, lineHeight: 22 },
  unitToggle: { flexDirection: "row", gap: spacing.xs },
  unitBtn: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1 },
  unitBtnText: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  listRowLabel: { fontSize: 15, fontWeight: "600" },
  customInput: { flex: 1, borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 16, fontWeight: "600" },
  applyBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.sm },
  hint: { fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  devSubtitle: { fontSize: 11, marginBottom: spacing.sm, paddingLeft: spacing.xs, marginTop: -spacing.xs },
  devDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
