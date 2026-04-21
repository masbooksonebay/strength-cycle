import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, Theme } from "../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey =
  | "overview"
  | "lifts"
  | "trainingMax"
  | "cycle"
  | "progression"
  | "technique"
  | "glossary";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "lifts", title: "The 4 Main Lifts" },
  { key: "trainingMax", title: "Training Max" },
  { key: "cycle", title: "The 4-Week Cycle" },
  { key: "progression", title: "Progression" },
  { key: "technique", title: "Technique Tips" },
  { key: "glossary", title: "Glossary" },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "1RM (One Rep Max)", def: "The maximum weight you can lift for one rep." },
  { term: "AMRAP", def: "As Many Reps As Possible. On the final working set each week, do as many reps as you can with good form." },
  { term: "Cycle", def: "One complete 4-week block (Weeks 1–4)." },
  { term: "Deload", def: "A lighter week at the end of each 4-week cycle for recovery." },
  { term: "e1RM (Estimated 1RM)", def: "A calculated estimate of your 1RM based on weight and reps, using the Epley formula: weight × (1 + reps/30)." },
  { term: "Jokers", def: "Optional heavier sets after the AMRAP set when feeling strong. Typically +5% or +10% beyond top weight for 1–3 reps. Use sparingly; Wendler's 5/3/1 Forever explains when they're appropriate." },
  { term: "PR (Personal Record)", def: "Any best-ever performance for a given lift. In 5/3/1, most PRs come from AMRAP sets." },
  { term: "Rep PR", def: "Beating your previous best rep count on the AMRAP set at the same working weight. Tracked per lift per cycle." },
  { term: "TM (Training Max)", def: "The weight your percentages are based on. Default: 90% of your 1RM." },
  { term: "TM Progression", def: "The scheduled increase in Training Max after each completed cycle." },
  { term: "Top Set", def: "The heaviest set of the day for a given lift. In 5/3/1's main phases, this is the AMRAP set." },
  { term: "Warm-up Sets", def: "Lighter sets before working sets to prepare the body." },
  { term: "Working Sets", def: "The main sets where the primary training stimulus occurs." },
];

const TECHNIQUE: { lift: string; setup: string[]; execution: string[]; mistakes: string[] }[] = [
  {
    lift: "Squat",
    setup: [
      "Bar positioned on upper traps (high bar) or rear delts (low bar) — low bar for powerlifting-style 5/3/1",
      "Feet shoulder-width to slightly wider, toes angled out 15–30°",
      "Hands grip bar tight, elbows down, chest up, big breath into belly before unrack",
    ],
    execution: [
      "Break at hips and knees simultaneously, not just knees",
      "Descend until hip crease is below top of knee (parallel or below)",
      "Knees track over toes, not caving inward",
      "Drive up through mid-foot and heel, chest leading",
    ],
    mistakes: [
      "Knees caving in on the way up (weak glutes/cues)",
      "Rounding lower back at the bottom (\"butt wink\") — reduce depth or mobility work",
      "Good-morning pattern on heavy sets (hips shoot up first) — re-focus on chest-leading",
    ],
  },
  {
    lift: "Bench Press",
    setup: [
      "Feet planted flat, shoulders retracted and pulled into bench, slight arch in upper back",
      "Grip roughly 1.5x shoulder width — find what puts forearms vertical at chest",
      "Unrack with straight arms, settle bar over shoulders before descending",
    ],
    execution: [
      "Lower bar under control to mid-chest (nipple line for most)",
      "Keep elbows tucked ~45–60° from torso, not flared to 90°",
      "Pause optional on heavy sets; paused reps build raw strength",
      "Drive bar up and slightly back toward face, not straight up",
    ],
    mistakes: [
      "Elbows flaring out to 90° — increases shoulder strain, reduces leverage",
      "Bouncing bar off chest — reduces training stimulus and risks injury",
      "Losing upper back tightness mid-set — reset between reps if needed",
    ],
  },
  {
    lift: "Deadlift",
    setup: [
      "Bar over mid-foot, close to shins",
      "Feet hip-width, toes slightly out (conventional) or wider (sumo — choose one style per cycle, don't alternate)",
      "Grip just outside knees, hips higher than knees, chest up, lats engaged (think \"bend the bar around you\")",
    ],
    execution: [
      "Take slack out of bar before pulling — feel the plates lift off slightly",
      "Push the floor away with legs first, bar stays in contact with shins and thighs",
      "Lock out with hips, not by leaning back; stand tall, don't hyperextend",
      "Control descent or drop (bumpers only)",
    ],
    mistakes: [
      "Lower back rounding under load — reduce weight, fix setup, consider mobility work",
      "Hips shooting up first (turning the lift into a stiff-leg deadlift) — re-cue \"push floor away with legs\"",
      "Jerking the bar off the floor — take slack out first, build tension before pull",
    ],
  },
  {
    lift: "Overhead Press",
    setup: [
      "Bar in front rack position, resting on shoulders with elbows slightly in front of bar",
      "Grip just outside shoulder-width, wrists stacked over elbows",
      "Feet hip-to-shoulder width, glutes and core braced hard (no leg drive on strict press)",
    ],
    execution: [
      "Press bar straight up, moving head back slightly to clear chin",
      "Once bar clears forehead, push head through — finish with bar over mid-foot, ears between arms",
      "Squeeze glutes throughout to prevent lower back hyperextension",
    ],
    mistakes: [
      "Leaning back excessively to press the bar — turns it into a standing incline press, strains lower back",
      "Bar drifting forward on the press — keep it vertical, push through the bar",
      "Soft core/glutes — bracing is what keeps the press strict and the lower back safe",
    ],
  },
];

export function ProgramGuide({ theme }: { theme: Theme }) {
  const [expanded, setExpanded] = useState<SectionKey | null>("overview");

  const toggle = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((cur) => (cur === key ? null : key));
  };

  const body = { color: theme.text, opacity: 0.88 };

  return (
    <View style={styles.root}>
      {SECTIONS.map(({ key, title }) => {
        const open = expanded === key;
        return (
          <View key={key} style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity onPress={() => toggle(key)} style={styles.sectionHeader} activeOpacity={0.7}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{title.toUpperCase()}</Text>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            {open && (
              <View style={[styles.sectionBody, { borderTopColor: theme.border }]}>
                {key === "overview" && (
                  <Text style={[styles.para, body]}>
                    5/3/1 is a strength training program created by Jim Wendler. It is built around four main barbell lifts and uses percentage-based loading to drive slow, consistent progress over time. The core philosophy: start lighter than you think you need to, progress slowly, and focus on long-term strength gains.
                  </Text>
                )}

                {key === "lifts" && (
                  <View>
                    {["Squat", "Bench Press", "Deadlift", "Overhead Press"].map((l) => (
                      <Text key={l} style={[styles.bullet, body]}>•  {l}</Text>
                    ))}
                  </View>
                )}

                {key === "trainingMax" && (
                  <Text style={[styles.para, body]}>
                    Your Training Max is NOT your true 1 Rep Max. It is the weight all percentages are calculated from. Default is 90% of your 1RM. Starting conservative allows you to build momentum and avoid stalling early.
                  </Text>
                )}

                {key === "cycle" && (
                  <View>
                    <Text style={[styles.subHeader, { color: theme.text }]}>Week 1 — 5/5/5+</Text>
                    <Text style={[styles.line, body]}>Warm-up: 50%×5, 60%×5, 65%×5</Text>
                    <Text style={[styles.line, body]}>Working sets: 75%×5, 85%×5+</Text>

                    <Text style={[styles.subHeader, { color: theme.text }]}>Week 2 — 3/3/3+</Text>
                    <Text style={[styles.line, body]}>Warm-up: 50%×5, 60%×5, 70%×5</Text>
                    <Text style={[styles.line, body]}>Working sets: 80%×3, 90%×3+</Text>

                    <Text style={[styles.subHeader, { color: theme.text }]}>Week 3 — 5/3/1+</Text>
                    <Text style={[styles.line, body]}>Warm-up: 50%×5, 60%×5, 75%×5</Text>
                    <Text style={[styles.line, body]}>Working sets: 85%×5, 90%×3, 95%×1+</Text>

                    <Text style={[styles.subHeader, { color: theme.text }]}>Week 4 — Deload</Text>
                    <Text style={[styles.line, body]}>Light sets: 40%×5, 50%×5, 60%×5</Text>

                    <Text style={[styles.hint, { color: theme.textSecondary }]}>(×+ = AMRAP — do as many reps as possible on the final set)</Text>
                  </View>
                )}

                {key === "progression" && (
                  <View>
                    <Text style={[styles.para, body]}>After completing a full 4-week cycle, increase your Training Max:</Text>
                    <Text style={[styles.bullet, body]}>•  Upper body lifts (Bench, Overhead Press): +5 lbs</Text>
                    <Text style={[styles.bullet, body]}>•  Lower body lifts (Squat, Deadlift): +10 lbs</Text>
                  </View>
                )}

                {key === "technique" && (
                  <View>
                    {TECHNIQUE.map((t) => (
                      <View key={t.lift} style={styles.techLift}>
                        <Text style={[styles.techLiftName, { color: theme.accent }]}>{t.lift.toUpperCase()}</Text>
                        <Text style={[styles.techLabel, { color: theme.text }]}>Setup</Text>
                        {t.setup.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                        <Text style={[styles.techLabel, { color: theme.text }]}>Execution</Text>
                        {t.execution.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                        <Text style={[styles.techLabel, { color: theme.text }]}>Common mistakes</Text>
                        {t.mistakes.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                      </View>
                    ))}
                  </View>
                )}

                {key === "glossary" && (
                  <View>
                    {GLOSSARY.map((g) => (
                      <View key={g.term} style={styles.glossEntry}>
                        <Text style={[styles.glossTerm, { color: theme.text }]}>{g.term}</Text>
                        <Text style={[styles.glossDef, body]}>{g.def}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={[styles.learnMore, { borderColor: theme.border }]}>
        <Text style={[styles.learnMoreTitle, { color: theme.text }]}>LEARN MORE</Text>
        <Text style={[styles.bullet, body]}>•  5/3/1: The Simplest and Most Effective Training System — Jim Wendler's book, canonical source</Text>
        <Text style={[styles.bullet, body]}>•  Stronger By Science — research-backed strength training content</Text>
        <Text style={[styles.bullet, body]}>•  Alan Thrall / Untamed Strength — free YouTube form tutorials</Text>
        <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>Educational content only. Consult a qualified coach for personalized form feedback.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: spacing.xl },
  section: { borderWidth: 1, borderRadius: borderRadius.md, marginBottom: spacing.sm, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.6 },
  sectionBody: { padding: spacing.md, borderTopWidth: 1 },
  para: { fontSize: 14, lineHeight: 22 },
  bullet: { fontSize: 14, lineHeight: 22, paddingLeft: 4 },
  line: { fontSize: 14, lineHeight: 22 },
  subHeader: { fontSize: 14, fontWeight: "800", marginTop: spacing.sm, marginBottom: 2 },
  hint: { fontSize: 12, marginTop: spacing.sm, fontStyle: "italic" },
  techLift: { marginBottom: spacing.md },
  techLiftName: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, marginBottom: spacing.xs },
  techLabel: { fontSize: 13, fontWeight: "800", marginTop: spacing.sm, marginBottom: 2 },
  glossEntry: { marginBottom: spacing.sm + 2 },
  glossTerm: { fontSize: 14, fontWeight: "800" },
  glossDef: { fontSize: 13, lineHeight: 19, marginTop: 1 },
  learnMore: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md },
  learnMoreTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.6, marginBottom: spacing.sm },
  disclaimer: { fontSize: 12, fontStyle: "italic", marginTop: spacing.md },
});
