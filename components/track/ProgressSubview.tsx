import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useApp } from "../../lib/context";
import { WEEKS } from "../../lib/program";
import {
  e1rmSeriesForLift,
  tmSeriesForLift,
  amrapTableForLift,
  cycleWeekSnapshot,
  uniqueCycles,
} from "../../lib/analytics";
import { spacing, borderRadius } from "../../constants/theme";

export function ProgressSubview() {
  const { data, theme } = useApp();

  if (!data.settings.progressLog) {
    return (
      <ScrollView contentContainerStyle={styles.lockContainer}>
        <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
        <Text style={[styles.lockTitle, { color: theme.text }]}>Progress</Text>
        <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>Unlock Progress to view Estimated 1RM and Training Max charts for every lift, AMRAP rep history, and cycle comparison.</Text>
        <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: theme.accent }]}>
          <Text style={styles.unlockBtnText}>Unlock — $1.99</Text>
        </TouchableOpacity>
        <Text style={[styles.bundleLabel, { color: theme.textSecondary }]}>Or get all features with PRO Bundle — $4.99</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <E1RMSection />
      <TMSection />
      <AmrapSection />
      <CycleCompareSection />
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function LiftPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, theme } = useApp();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      {data.lifts.map((l) => {
        const active = value === l.name;
        return (
          <TouchableOpacity key={l.name} onPress={() => onChange(l.name)} style={[styles.pill, { borderColor: theme.border, backgroundColor: active ? theme.accent : theme.card }]}>
            <Text style={[styles.pillText, { color: active ? "#fff" : theme.text }]}>{l.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useApp();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const { theme } = useApp();
  return (
    <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

// Section (a) — e1RM line chart
function E1RMSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");

  const points = useMemo(() => e1rmSeriesForLift(data.workouts, lift), [data.workouts, lift]);
  const chartData = useMemo(() => points.map((p, i) => ({
    value: p.value,
    label: new Date(p.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    showLabel: i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2),
  })), [points]);

  const width = Dimensions.get("window").width - spacing.md * 2 - 24;
  const maxY = points.length ? Math.max(...points.map((p) => p.value)) : 0;
  const minY = points.length ? Math.min(...points.map((p) => p.value)) : 0;

  return (
    <View style={styles.section}>
      <SectionHeader title="e1RM Trend" subtitle="Auto-calculated from AMRAP sets — Epley formula" />
      <LiftPicker value={lift} onChange={setLift} />
      {points.length === 0 ? (
        <EmptyState message={`No AMRAP data yet for ${lift}. Log an AMRAP set to populate this chart.`} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <LineChart
            data={chartData}
            width={width}
            height={180}
            hideDataPoints={false}
            color={theme.accent}
            dataPointsColor={theme.accent}
            thickness={2}
            initialSpacing={10}
            spacing={Math.max(20, Math.floor(width / Math.max(chartData.length, 1)))}
            yAxisColor={theme.border}
            xAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            noOfSections={3}
            maxValue={maxY + 10}
            yAxisOffset={Math.max(0, minY - 10)}
            curved={false}
            rulesColor={theme.border}
            hideRules={false}
          />
          <View style={styles.chartFooter}>
            <Text style={[styles.chartFooterText, { color: theme.textSecondary }]}>
              Latest: <Text style={{ color: theme.accent, fontWeight: "800" }}>{points[points.length - 1].value} {unitLabel}</Text>
              {points.length > 1 && <Text>  ·  Δ {points[points.length - 1].value - points[0].value >= 0 ? "+" : ""}{points[points.length - 1].value - points[0].value} {unitLabel} over {points.length} sessions</Text>}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Section (b) — TM progression (bar chart by cycle)
function TMSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");

  const tmPoints = useMemo(() => tmSeriesForLift(data.workouts, lift), [data.workouts, lift]);
  const barData = useMemo(() => tmPoints.map((p) => ({
    value: p.tm,
    label: `C${p.cycle}`,
    frontColor: theme.accent,
  })), [tmPoints, theme.accent]);

  const width = Dimensions.get("window").width - spacing.md * 2 - 24;
  const maxY = tmPoints.length ? Math.max(...tmPoints.map((p) => p.tm)) : 0;

  return (
    <View style={styles.section}>
      <SectionHeader title="TM Progression" subtitle="Training Max derived per cycle from logged working sets" />
      <LiftPicker value={lift} onChange={setLift} />
      {tmPoints.length === 0 ? (
        <EmptyState message={`No cycle data yet for ${lift}. Log a working set in any cycle week to populate.`} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <BarChart
            data={barData}
            width={width}
            height={180}
            barWidth={Math.max(18, Math.floor(width / Math.max(barData.length * 2, 2)))}
            spacing={Math.max(16, Math.floor(width / Math.max(barData.length * 2, 2)))}
            frontColor={theme.accent}
            yAxisColor={theme.border}
            xAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            noOfSections={3}
            maxValue={maxY + 10}
            rulesColor={theme.border}
          />
          <View style={styles.chartFooter}>
            <Text style={[styles.chartFooterText, { color: theme.textSecondary }]}>
              Latest TM: <Text style={{ color: theme.accent, fontWeight: "800" }}>{tmPoints[tmPoints.length - 1].tm} {unitLabel}</Text>
              {tmPoints.length > 1 && <Text>  ·  Δ {tmPoints[tmPoints.length - 1].tm - tmPoints[0].tm >= 0 ? "+" : ""}{tmPoints[tmPoints.length - 1].tm - tmPoints[0].tm} {unitLabel} over {tmPoints.length} cycles</Text>}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Section (c) — AMRAP rep history table
function AmrapSection() {
  const { data, theme } = useApp();
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");
  const rows = useMemo(() => amrapTableForLift(data.workouts, lift), [data.workouts, lift]);

  return (
    <View style={styles.section}>
      <SectionHeader title="AMRAP Reps by Cycle" subtitle="Top-set AMRAP performance each week" />
      <LiftPicker value={lift} onChange={setLift} />
      {rows.length === 0 ? (
        <EmptyState message={`No AMRAP history yet for ${lift}.`} />
      ) : (
        <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.textSecondary, fontWeight: "800" }]}>CYCLE</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>5/5/5</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>3/3/3</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>5/3/1</Text>
          </View>
          {rows.map((r, idx) => (
            <View key={r.cycle} style={[styles.tableRow, { borderBottomColor: theme.border, borderBottomWidth: idx === rows.length - 1 ? 0 : 0.5 }]}>
              <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.text, fontWeight: "700" }]}>{r.cycle}</Text>
              <Text style={[styles.tableCell, { color: theme.text }]}>{r.w555 ?? "—"}</Text>
              <Text style={[styles.tableCell, { color: theme.text }]}>{r.w333 ?? "—"}</Text>
              <Text style={[styles.tableCell, { color: theme.text }]}>{r.w531 ?? "—"}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Section (d) — Cycle Comparison
const AMRAP_WEEKS = ["5/5/5", "3/3/3", "5/3/1"] as const;

function CycleCompareSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const cycles = useMemo(() => uniqueCycles(data.workouts), [data.workouts]);
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");
  const [week, setWeek] = useState<string>("5/3/1");
  const [cycleA, setCycleA] = useState<number | null>(cycles[1] ?? null);
  const [cycleB, setCycleB] = useState<number | null>(cycles[0] ?? null);

  const snapA = useMemo(() => cycleA !== null ? cycleWeekSnapshot(data.workouts, lift, cycleA, week) : null, [data.workouts, lift, cycleA, week]);
  const snapB = useMemo(() => cycleB !== null ? cycleWeekSnapshot(data.workouts, lift, cycleB, week) : null, [data.workouts, lift, cycleB, week]);

  return (
    <View style={styles.section}>
      <SectionHeader title="Cycle Comparison" subtitle="Side-by-side top set across two cycles, same week" />
      <LiftPicker value={lift} onChange={setLift} />

      <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>WEEK</Text>
      <View style={styles.pillRowStatic}>
        {AMRAP_WEEKS.map((w) => {
          const active = week === w;
          return (
            <TouchableOpacity key={w} onPress={() => setWeek(w)} style={[styles.pill, { borderColor: theme.border, backgroundColor: active ? theme.accent : theme.card }]}>
              <Text style={[styles.pillText, { color: active ? "#fff" : theme.text }]}>{w}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {cycles.length < 2 ? (
        <EmptyState message="Log workouts in at least two cycles to compare." />
      ) : (
        <>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>CYCLE A</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {cycles.map((c) => {
              const active = cycleA === c;
              return (
                <TouchableOpacity key={c} onPress={() => setCycleA(c)} style={[styles.pill, { borderColor: theme.border, backgroundColor: active ? theme.accent : theme.card }]}>
                  <Text style={[styles.pillText, { color: active ? "#fff" : theme.text }]}>Cycle {c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>CYCLE B</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {cycles.map((c) => {
              const active = cycleB === c;
              return (
                <TouchableOpacity key={c} onPress={() => setCycleB(c)} style={[styles.pill, { borderColor: theme.border, backgroundColor: active ? theme.accent : theme.card }]}>
                  <Text style={[styles.pillText, { color: active ? "#fff" : theme.text }]}>Cycle {c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.compareRow}>
            <CompareCard title={cycleA !== null ? `Cycle ${cycleA}` : "—"} snap={snapA} unitLabel={unitLabel} theme={theme} />
            <CompareCard title={cycleB !== null ? `Cycle ${cycleB}` : "—"} snap={snapB} unitLabel={unitLabel} theme={theme} />
          </View>

          {snapA?.workout && snapB?.workout && (
            <View style={[styles.deltaCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.deltaTitle, { color: theme.textSecondary }]}>DELTA (B − A)</Text>
              <DeltaRow label="Top-set weight" a={snapA.topSetWeight} b={snapB.topSetWeight} suffix={` ${unitLabel}`} theme={theme} />
              <DeltaRow label="AMRAP reps" a={snapA.amrapReps} b={snapB.amrapReps} suffix="" theme={theme} />
              <DeltaRow label="e1RM" a={snapA.e1rm} b={snapB.e1rm} suffix={` ${unitLabel}`} theme={theme} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function CompareCard({ title, snap, unitLabel, theme }: { title: string; snap: ReturnType<typeof cycleWeekSnapshot> | null; unitLabel: string; theme: any }) {
  return (
    <View style={[styles.compareCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.compareTitle, { color: theme.accent }]}>{title}</Text>
      {!snap || !snap.workout ? (
        <Text style={[styles.compareMissing, { color: theme.textSecondary }]}>No workout logged</Text>
      ) : (
        <>
          <Text style={[styles.compareRowLabel, { color: theme.textSecondary }]}>TOP SET</Text>
          <Text style={[styles.compareRowValue, { color: theme.text }]}>{snap.topSetWeight ?? "—"} {unitLabel}</Text>
          <Text style={[styles.compareRowLabel, { color: theme.textSecondary }]}>AMRAP</Text>
          <Text style={[styles.compareRowValue, { color: theme.text }]}>{snap.amrapReps !== null ? `${snap.amrapReps} reps` : "—"}</Text>
          <Text style={[styles.compareRowLabel, { color: theme.textSecondary }]}>e1RM</Text>
          <Text style={[styles.compareRowValue, { color: theme.text }]}>{snap.e1rm !== null ? `${snap.e1rm} ${unitLabel}` : "—"}</Text>
        </>
      )}
    </View>
  );
}

function DeltaRow({ label, a, b, suffix, theme }: { label: string; a: number | null; b: number | null; suffix: string; theme: any }) {
  const delta = (a !== null && b !== null) ? b - a : null;
  const color = delta === null ? theme.textSecondary : delta > 0 ? theme.accent : delta < 0 ? "#CC4040" : theme.textSecondary;
  const sign = delta !== null ? (delta > 0 ? "+" : "") : "";
  return (
    <View style={styles.deltaRow}>
      <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.deltaValue, { color }]}>{delta === null ? "—" : `${sign}${delta}${suffix}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  lockContainer: { alignItems: "center", padding: spacing.xl, paddingTop: 80 },
  lockTitle: { fontSize: 24, fontWeight: "800", marginTop: spacing.md },
  lockDesc: { fontSize: 14, textAlign: "center", marginTop: spacing.sm, lineHeight: 20, maxWidth: 300 },
  unlockBtn: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.md, width: "100%", alignItems: "center" },
  unlockBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bundleLabel: { fontSize: 12, marginTop: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionSub: { fontSize: 12, marginTop: 2 },
  pillRow: { flexDirection: "row", gap: 6, paddingVertical: spacing.sm, paddingRight: spacing.md },
  pillRowStatic: { flexDirection: "row", gap: 6, paddingVertical: spacing.sm, flexWrap: "wrap" },
  pill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "700" },
  pickerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: spacing.sm },
  chartCard: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.xs },
  chartFooter: { marginTop: spacing.sm },
  chartFooterText: { fontSize: 12 },
  empty: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg, marginTop: spacing.sm, alignItems: "center" },
  emptyText: { fontSize: 13 },
  table: { borderWidth: 1, borderRadius: borderRadius.md, overflow: "hidden", marginTop: spacing.sm },
  tableRow: { flexDirection: "row", paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  tableHead: { borderBottomWidth: 1 },
  tableCell: { flex: 1, fontSize: 13, textAlign: "center" },
  tableCellFirst: { flex: 0.7, textAlign: "left" },
  compareRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  compareCard: { flex: 1, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md },
  compareTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginBottom: spacing.sm },
  compareMissing: { fontSize: 13 },
  compareRowLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: spacing.sm },
  compareRowValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  deltaCard: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm },
  deltaTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: spacing.sm },
  deltaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  deltaLabel: { fontSize: 13 },
  deltaValue: { fontSize: 14, fontWeight: "800" },
});
