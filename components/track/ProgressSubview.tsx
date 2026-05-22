import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutChangeEvent, LayoutAnimation, Platform, UIManager } from "react-native";
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
  intensityTableForLift,
  weeklyProgressionTable,
  uniqueTMWeeks,
  tmWeeksCompleted,
  tmPRLog,
  workingWeightSeriesForLift,
  ssWorkoutCounts,
  ssStallEvents,
  ssPRLog,
} from "../../lib/analytics";
import { spacing, borderRadius } from "../../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  // Conditional rendering at this layer (rather than early-return inside each
  // section) keeps section-internal hooks stable when activeProgram flips.
  // Each section is its own component with its own hooks; switching program
  // unmounts one program's section set and mounts another's — hook counts
  // never change on a persistent instance.
  const program = data.activeProgram;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {program === "startingStrength" ? (
        <>
          <WorkingWeightTrendSection />
          <SSWorkoutCountSection />
          <SSStallEventsSection />
          <SSPRLogSection />
        </>
      ) : program === "texasMethod" ? (
        <>
          <E1RMSection />
          <FiveRMProgressionSection />
          <WeeklyProgressionSection />
          <TMWeekCounterSection />
          <TMPRLogSection />
        </>
      ) : (
        <>
          <E1RMSection />
          <TMSection />
          <AmrapSection />
          <CycleCompareSection />
        </>
      )}
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
  const [plotWidth, setPlotWidth] = useState<number | null>(null);

  const points = useMemo(() => e1rmSeriesForLift(data.workouts, lift), [data.workouts, lift]);
  const chartData = useMemo(() => points.map((p, i) => ({
    value: p.value,
    label: new Date(p.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    showLabel: i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2),
  })), [points]);

  const maxY = points.length ? Math.max(...points.map((p) => p.value)) : 0;
  const minY = points.length ? Math.min(...points.map((p) => p.value)) : 0;

  // Apple Health-style data-relative Y-axis: ~8% padding below min, ~8% above max,
  // snapped to nearest 10. yAxisOffset shifts data down internally — see
  // gifted-charts-core/dist/utils/index.js:1092 (adjustToOffset). maxValue is the
  // *shifted* max, so we pass (yMax - yMin) rather than yMax directly.
  const yMin = Math.floor((minY * 0.92) / 10) * 10;
  const yMax = Math.ceil((maxY * 1.08) / 10) * 10;
  const yStep = Math.max(10, Math.ceil((yMax - yMin) / 4 / 10) * 10);
  const yMaxShifted = yStep * 4;

  // Measure the real container width on layout — accounts for ScrollView + chartCard padding
  // that a window-based calc can't see. Subtract gifted-charts' y-axis label area (~35px) and
  // a small right buffer so the last data point + label aren't clipped.
  const handleLayout = (e: LayoutChangeEvent) => {
    const next = Math.max(100, Math.floor(e.nativeEvent.layout.width - 35 - 12));
    if (next !== plotWidth) setPlotWidth(next);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="e1RM Trend" subtitle="Auto-calculated from AMRAP sets — Epley formula" />
      <LiftPicker value={lift} onChange={setLift} />
      {points.length === 0 ? (
        <EmptyState message={`No AMRAP data yet for ${lift}. Log an AMRAP set to populate this chart.`} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.chartMeasure} onLayout={handleLayout}>
            {plotWidth !== null && (
              <LineChart
                data={chartData}
                width={plotWidth}
                height={180}
                hideDataPoints={false}
                color={theme.accent}
                dataPointsColor={theme.accent}
                thickness={2}
                initialSpacing={10}
                spacing={Math.max(20, Math.floor(plotWidth / Math.max(chartData.length, 1)))}
                yAxisColor={theme.border}
                xAxisColor={theme.border}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                noOfSections={4}
                stepValue={yStep}
                maxValue={yMaxShifted}
                yAxisOffset={yMin}
                roundToDigits={0}
                areaChart
                startFillColor={theme.accent}
                endFillColor={theme.accent}
                startOpacity={0.25}
                endOpacity={0}
                curved={false}
                rulesColor={theme.border}
                hideRules={false}
              />
            )}
          </View>
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
  const [plotWidth, setPlotWidth] = useState<number | null>(null);

  const tmPoints = useMemo(() => tmSeriesForLift(data.workouts, lift), [data.workouts, lift]);
  const barData = useMemo(() => tmPoints.map((p) => ({
    value: p.tm,
    label: `C${p.cycle}`,
    frontColor: theme.accent,
  })), [tmPoints, theme.accent]);

  const maxY = tmPoints.length ? Math.max(...tmPoints.map((p) => p.tm)) : 0;

  // Same pattern as E1RMSection — measure actual container width, subtract y-axis label
  // area (~35px) and a right buffer so the last bar isn't clipped.
  const handleLayout = (e: LayoutChangeEvent) => {
    const next = Math.max(100, Math.floor(e.nativeEvent.layout.width - 35 - 12));
    if (next !== plotWidth) setPlotWidth(next);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="TM Progression" subtitle="Your Training Max across completed cycles." />
      <LiftPicker value={lift} onChange={setLift} />
      {tmPoints.length === 0 ? (
        <EmptyState message={`No cycle data yet for ${lift}. Complete a cycle to start tracking TM progression.`} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.chartMeasure} onLayout={handleLayout}>
            {plotWidth !== null && (
              <BarChart
                data={barData}
                width={plotWidth}
                height={180}
                barWidth={Math.min(72, Math.max(18, Math.floor(plotWidth / Math.max(barData.length * 2, 2))))}
                spacing={Math.max(16, Math.floor(plotWidth / Math.max(barData.length * 2, 2)))}
                frontColor={theme.accent}
                yAxisColor={theme.border}
                xAxisColor={theme.border}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                noOfSections={3}
                maxValue={maxY + 10}
                rulesColor={theme.border}
              />
            )}
          </View>
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
const AMRAP_DEFAULT_VISIBLE = 5;

function AmrapSection() {
  const { data, theme } = useApp();
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => amrapTableForLift(data.workouts, lift), [data.workouts, lift]);

  const canTruncate = rows.length > AMRAP_DEFAULT_VISIBLE;
  const visibleRows = expanded || !canTruncate ? rows : rows.slice(0, AMRAP_DEFAULT_VISIBLE);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="AMRAP Reps by Cycle" subtitle="Top-set AMRAP performance each week" />
      <LiftPicker value={lift} onChange={setLift} />
      {rows.length === 0 ? (
        <EmptyState message={`No AMRAP history yet for ${lift}.`} />
      ) : (
        <>
          <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: theme.border }]}>
              <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.textSecondary, fontWeight: "800" }]}>CYCLE</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>5/5/5</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>3/3/3</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>5/3/1</Text>
            </View>
            {visibleRows.map((r, idx) => (
              <View key={r.cycle} style={[styles.tableRow, { borderBottomColor: theme.border, borderBottomWidth: idx === visibleRows.length - 1 ? 0 : 0.5 }]}>
                <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.text, fontWeight: "700" }]}>{r.cycle}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.w555 ?? "—"}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.w333 ?? "—"}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.w531 ?? "—"}</Text>
              </View>
            ))}
          </View>
          {canTruncate && (
            <TouchableOpacity onPress={toggle} style={styles.amrapToggle} activeOpacity={0.6}>
              <Text style={[styles.amrapToggleText, { color: theme.accent }]}>
                {expanded ? "Show Recent Only" : `Show All ${rows.length} Cycles`}
              </Text>
            </TouchableOpacity>
          )}
        </>
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
  const [week, setWeek] = useState<string>("5/5/5");
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

// ─── Texas Method sections ────────────────────────────────────────────────
// Mounted instead of AmrapSection / CycleCompareSection when activeProgram
// is "texasMethod". They share the LiftPicker / SectionHeader / EmptyState
// helpers above and the same table/pill styles, so visual vocabulary stays
// consistent across both program views.

const FIVE_RM_DEFAULT_VISIBLE = 5;

// TM equivalent of AmrapSection. Each row = one Intensity Day for the
// selected lift, columns = weight / reps / e1RM.
function FiveRMProgressionSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => intensityTableForLift(data.workouts, lift), [data.workouts, lift]);

  const canTruncate = rows.length > FIVE_RM_DEFAULT_VISIBLE;
  const visibleRows = expanded || !canTruncate ? rows : rows.slice(0, FIVE_RM_DEFAULT_VISIBLE);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="5RM Progression by Week" subtitle="Friday Intensity Day PR attempt each week" />
      <LiftPicker value={lift} onChange={setLift} />
      {rows.length === 0 ? (
        <EmptyState message={`Complete your first Intensity Day for ${lift} to see 5RM progression.`} />
      ) : (
        <>
          <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: theme.border }]}>
              <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.textSecondary, fontWeight: "800" }]}>WEEK</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>WEIGHT</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>REPS</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800" }]}>e1RM</Text>
            </View>
            {visibleRows.map((r, idx) => (
              <View key={r.week} style={[styles.tableRow, { borderBottomColor: theme.border, borderBottomWidth: idx === visibleRows.length - 1 ? 0 : 0.5 }]}>
                <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.text, fontWeight: "700" }]}>{r.week}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.weight} {unitLabel}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.reps}</Text>
                <Text style={[styles.tableCell, { color: theme.text }]}>{r.e1rm}</Text>
              </View>
            ))}
          </View>
          {canTruncate && (
            <TouchableOpacity onPress={toggle} style={styles.amrapToggle} activeOpacity={0.6}>
              <Text style={[styles.amrapToggleText, { color: theme.accent }]}>
                {expanded ? "Show Recent Only" : `Show All ${rows.length} Weeks`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// TM equivalent of CycleCompareSection. Multi-lift table: rows = weeks,
// columns = each lift's Friday Intensity Day weight. Off-week upper-body
// cells render as "—".
function WeeklyProgressionSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const liftNames = useMemo(() => data.lifts.map((l) => l.name), [data.lifts]);
  const rows = useMemo(() => weeklyProgressionTable(data.workouts, liftNames), [data.workouts, liftNames]);
  const tmWeeks = useMemo(() => uniqueTMWeeks(data.workouts), [data.workouts]);

  // Short labels for column headers — full lift names get truncated when 4
  // lifts share the row width.
  const shortLabel = (name: string): string => {
    if (name === "Bench Press") return "BENCH";
    if (name === "Overhead Press") return "OHP";
    if (name === "Deadlift") return "DEAD";
    return name.toUpperCase();
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Weekly Progression" subtitle="Each row is one week's Intensity Day 5RM attempt across lifts" />
      {tmWeeks.length === 0 ? (
        <EmptyState message="Weekly progression appears after your first complete week." />
      ) : (
        <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.textSecondary, fontWeight: "800" }]}>WK</Text>
            {liftNames.map((name) => (
              <Text key={name} style={[styles.tableCell, { color: theme.textSecondary, fontWeight: "800", fontSize: 11 }]}>{shortLabel(name)}</Text>
            ))}
          </View>
          {rows.map((r, idx) => (
            <View key={r.week} style={[styles.tableRow, { borderBottomColor: theme.border, borderBottomWidth: idx === rows.length - 1 ? 0 : 0.5 }]}>
              <Text style={[styles.tableCell, styles.tableCellFirst, { color: theme.text, fontWeight: "700" }]}>{r.week}</Text>
              {liftNames.map((name) => (
                <Text key={name} style={[styles.tableCell, { color: theme.text, fontSize: 12 }]}>
                  {r.weights[name] !== null ? `${r.weights[name]}` : "—"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
      {tmWeeks.length > 0 && (
        <Text style={[styles.weeklyHint, { color: theme.textSecondary }]}>Weights in {unitLabel}. Off-week upper-body lifts show "—" (no PR attempt that week).</Text>
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

// Compact relative-time label for PR-log rows.
function relativeTime(dateIso: string): string {
  const days = Math.floor((Date.now() - new Date(dateIso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

// Square stat card — a big value over a small caption.
function StatCard({ label, value, theme, accent }: { label: string; value: string; theme: any; accent?: boolean }) {
  return (
    <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.statValue, { color: accent ? theme.accent : theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const PR_DEFAULT_VISIBLE = 6;

// ─── Starting Strength sections ───────────────────────────────────────────
// Mounted when activeProgram is "startingStrength". SS is a working-weight
// linear-progression program, not an AMRAP / 1RM program — so instead of e1RM
// extrapolation these sections chart the working weight itself and tally A/B
// sessions, deload events, and per-lift PRs. They reuse the LiftPicker /
// SectionHeader / EmptyState helpers and chart styling above for consistency.

// SS analogue of E1RMSection — identical gifted-charts LineChart config and
// axis styling, plotting per-session working weight rather than an e1RM.
function WorkingWeightTrendSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [lift, setLift] = useState<string>(data.lifts[0]?.name || "Squat");
  const [plotWidth, setPlotWidth] = useState<number | null>(null);

  const points = useMemo(() => workingWeightSeriesForLift(data.workouts, lift), [data.workouts, lift]);
  const chartData = useMemo(() => points.map((p, i) => ({
    value: p.weight,
    label: new Date(p.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    showLabel: i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2),
  })), [points]);

  const maxY = points.length ? Math.max(...points.map((p) => p.weight)) : 0;
  const minY = points.length ? Math.min(...points.map((p) => p.weight)) : 0;

  // Same data-relative Y-axis math as E1RMSection.
  const yMin = Math.floor((minY * 0.92) / 10) * 10;
  const yMax = Math.ceil((maxY * 1.08) / 10) * 10;
  const yStep = Math.max(10, Math.ceil((yMax - yMin) / 4 / 10) * 10);
  const yMaxShifted = yStep * 4;

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = Math.max(100, Math.floor(e.nativeEvent.layout.width - 35 - 12));
    if (next !== plotWidth) setPlotWidth(next);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Working Weight Trend" subtitle="Working weight per session — linear progression" />
      <LiftPicker value={lift} onChange={setLift} />
      {points.length === 0 ? (
        <EmptyState message={`No ${lift} sessions logged yet. Complete a workout to populate this chart.`} />
      ) : (
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.chartMeasure} onLayout={handleLayout}>
            {plotWidth !== null && (
              <LineChart
                data={chartData}
                width={plotWidth}
                height={180}
                hideDataPoints={false}
                color={theme.accent}
                dataPointsColor={theme.accent}
                thickness={2}
                initialSpacing={10}
                spacing={Math.max(20, Math.floor(plotWidth / Math.max(chartData.length, 1)))}
                yAxisColor={theme.border}
                xAxisColor={theme.border}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                noOfSections={4}
                stepValue={yStep}
                maxValue={yMaxShifted}
                yAxisOffset={yMin}
                roundToDigits={0}
                areaChart
                startFillColor={theme.accent}
                endFillColor={theme.accent}
                startOpacity={0.25}
                endOpacity={0}
                curved={false}
                rulesColor={theme.border}
                hideRules={false}
              />
            )}
          </View>
          <View style={styles.chartFooter}>
            <Text style={[styles.chartFooterText, { color: theme.textSecondary }]}>
              Latest: <Text style={{ color: theme.accent, fontWeight: "800" }}>{points[points.length - 1].weight} {unitLabel}</Text>
              {points.length > 1 && <Text>  ·  Δ {points[points.length - 1].weight - points[0].weight >= 0 ? "+" : ""}{points[points.length - 1].weight - points[0].weight} {unitLabel} over {points.length} sessions</Text>}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// A/B session tally — three stat cards.
function SSWorkoutCountSection() {
  const { data, theme } = useApp();
  const counts = useMemo(() => ssWorkoutCounts(data.workouts), [data.workouts]);

  return (
    <View style={styles.section}>
      <SectionHeader title="Workout Count" subtitle="Completed A / B sessions" />
      {counts.total === 0 ? (
        <EmptyState message="No 3x5 Strength workouts logged yet." />
      ) : (
        <View style={styles.statRow}>
          <StatCard label="WORKOUT A" value={String(counts.a)} theme={theme} />
          <StatCard label="WORKOUT B" value={String(counts.b)} theme={theme} />
          <StatCard label="TOTAL" value={String(counts.total)} theme={theme} accent />
        </View>
      )}
    </View>
  );
}

// Deload-event tally — headline count + per-lift breakdown.
function SSStallEventsSection() {
  const { data, theme } = useApp();
  const stalls = useMemo(() => ssStallEvents(data.workouts), [data.workouts]);

  return (
    <View style={styles.section}>
      <SectionHeader title="Stall Events" subtitle="Deloads triggered by 2 consecutive failed sessions" />
      <View style={[styles.deltaCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.statHeadline}>
          <Text style={[styles.statHeadlineValue, { color: stalls.total === 0 ? theme.accent : theme.text }]}>{stalls.total}</Text>
          <Text style={[styles.statHeadlineLabel, { color: theme.textSecondary }]}>
            {stalls.total === 0
              ? "no stalls — clean linear progression"
              : stalls.total === 1
                ? "deload event"
                : "deload events"}
          </Text>
        </View>
        {stalls.byLift.length > 0 && (
          <>
            <Text style={[styles.deltaTitle, { color: theme.textSecondary, marginTop: spacing.md }]}>BY LIFT</Text>
            {stalls.byLift.map((b) => (
              <View key={b.lift} style={styles.deltaRow}>
                <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>{b.lift}</Text>
                <Text style={[styles.deltaValue, { color: theme.text }]}>{b.count}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

// SS PR log — every working-weight increase, most-recent first.
function SSPRLogSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [expanded, setExpanded] = useState(false);
  const records = useMemo(() => ssPRLog(data.workouts), [data.workouts]);

  const canTruncate = records.length > PR_DEFAULT_VISIBLE;
  const visible = expanded || !canTruncate ? records : records.slice(0, PR_DEFAULT_VISIBLE);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="PR Log" subtitle="Every working-weight increase is a PR" />
      {records.length === 0 ? (
        <EmptyState message="PRs appear once you log a working-weight increase." />
      ) : (
        <>
          <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
            {visible.map((r, idx) => (
              <View key={`${r.lift}-${r.date}-${idx}`} style={[styles.prRow, { borderBottomColor: theme.border, borderBottomWidth: idx === visible.length - 1 ? 0 : 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prLift, { color: theme.text }]}>{r.lift}</Text>
                  <Text style={[styles.prChange, { color: theme.textSecondary }]}>
                    {r.from} → <Text style={{ color: theme.accent, fontWeight: "800" }}>{r.to} {unitLabel}</Text>
                  </Text>
                </View>
                <Text style={[styles.prWhen, { color: theme.textSecondary }]}>{relativeTime(r.date)}</Text>
              </View>
            ))}
          </View>
          {canTruncate && (
            <TouchableOpacity onPress={toggle} style={styles.amrapToggle} activeOpacity={0.6}>
              <Text style={[styles.amrapToggleText, { color: theme.accent }]}>
                {expanded ? "Show Recent Only" : `Show All ${records.length} PRs`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// ─── Texas Method extra sections ──────────────────────────────────────────
// Added alongside the existing TM e1RM / 5RM / weekly sections.

// Completed weekly cycles — a single headline stat.
function TMWeekCounterSection() {
  const { data, theme } = useApp();
  const weeks = useMemo(() => tmWeeksCompleted(data.workouts), [data.workouts]);

  return (
    <View style={styles.section}>
      <SectionHeader title="Week Counter" subtitle="Completed Volume / Recovery / Intensity weekly cycles" />
      <View style={[styles.deltaCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.statHeadline}>
          <Text style={[styles.statHeadlineValue, { color: theme.accent }]}>{weeks}</Text>
          <Text style={[styles.statHeadlineLabel, { color: theme.textSecondary }]}>
            {weeks === 1 ? "week completed" : "weeks completed"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// TM PR log — 5RM Intensity Day PRs plus deadlift Volume Day top-set PRs.
function TMPRLogSection() {
  const { data, theme } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [expanded, setExpanded] = useState(false);
  const liftNames = useMemo(() => data.lifts.map((l) => l.name), [data.lifts]);
  const records = useMemo(() => tmPRLog(data.workouts, liftNames), [data.workouts, liftNames]);

  const canTruncate = records.length > PR_DEFAULT_VISIBLE;
  const visible = expanded || !canTruncate ? records : records.slice(0, PR_DEFAULT_VISIBLE);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="PR Log" subtitle="5RM Intensity Day PRs · deadlift Volume Day top sets" />
      {records.length === 0 ? (
        <EmptyState message="PRs appear once you set a new best on Intensity or Volume Day." />
      ) : (
        <>
          <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.card }]}>
            {visible.map((r, idx) => (
              <View key={`${r.lift}-${r.date}-${idx}`} style={[styles.prRow, { borderBottomColor: theme.border, borderBottomWidth: idx === visible.length - 1 ? 0 : 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prLift, { color: theme.text }]}>
                    {r.lift} <Text style={[styles.prMetric, { color: theme.textSecondary }]}>{r.metric}</Text>
                  </Text>
                  <Text style={[styles.prChange, { color: theme.textSecondary }]}>
                    {r.from} → <Text style={{ color: theme.accent, fontWeight: "800" }}>{r.to} {unitLabel}</Text>
                  </Text>
                </View>
                <Text style={[styles.prWhen, { color: theme.textSecondary }]}>{relativeTime(r.date)}</Text>
              </View>
            ))}
          </View>
          {canTruncate && (
            <TouchableOpacity onPress={toggle} style={styles.amrapToggle} activeOpacity={0.6}>
              <Text style={[styles.amrapToggleText, { color: theme.accent }]}>
                {expanded ? "Show Recent Only" : `Show All ${records.length} PRs`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
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
  chartMeasure: { alignSelf: "stretch", minHeight: 180 },
  chartFooter: { marginTop: spacing.sm },
  chartFooterText: { fontSize: 12 },
  empty: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg, marginTop: spacing.sm, alignItems: "center" },
  emptyText: { fontSize: 13 },
  table: { borderWidth: 1, borderRadius: borderRadius.md, overflow: "hidden", marginTop: spacing.sm },
  tableRow: { flexDirection: "row", paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  tableHead: { borderBottomWidth: 1 },
  tableCell: { flex: 1, fontSize: 13, textAlign: "center" },
  tableCellFirst: { flex: 0.7, textAlign: "left" },
  amrapToggle: { alignItems: "center", paddingVertical: spacing.sm + 2, marginTop: spacing.xs },
  amrapToggleText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
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
  weeklyHint: { fontSize: 11, marginTop: spacing.xs, fontStyle: "italic" },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  statCard: { flex: 1, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
  statHeadline: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  statHeadlineValue: { fontSize: 34, fontWeight: "800" },
  statHeadlineLabel: { fontSize: 13 },
  prRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  prLift: { fontSize: 14, fontWeight: "700" },
  prMetric: { fontSize: 11, fontWeight: "700" },
  prChange: { fontSize: 13, marginTop: 2 },
  prWhen: { fontSize: 12 },
});
