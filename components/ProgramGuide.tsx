import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, Theme } from "../constants/theme";
import { TECHNIQUE, LIFT_DESCRIPTIONS, WEEK_DESCRIPTIONS } from "../constants/programContent";

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
  | "glossary"
  | "learnMore";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "lifts", title: "The 4 Main Lifts" },
  { key: "trainingMax", title: "Training Max" },
  { key: "cycle", title: "The 4-Week Cycle" },
  { key: "progression", title: "Progression" },
  { key: "technique", title: "Technique Tips" },
  { key: "glossary", title: "Glossary" },
  { key: "learnMore", title: "Learn More" },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "1RM (One Rep Max)", def: "The maximum weight you can lift for one rep." },
  { term: "AMRAP", def: "As Many Reps As Possible. On the final working set each week, do as many reps as you can with good form." },
  { term: "Cycle", def: "One complete 4-week block (Weeks 1–4)." },
  { term: "Deload", def: "A lighter week at the end of each 4-week cycle for recovery." },
  { term: "e1RM (Estimated 1RM)", def: "A calculated estimate of your 1RM based on weight and reps, using the Epley formula: weight × (1 + reps/30)." },
  { term: "Jokers", def: "Optional heavier sets after the AMRAP set when feeling strong. Typically +5% or +10% beyond top weight for 1–3 reps. Use sparingly; the 5/3/1 Forever book explains when they're appropriate." },
  { term: "PR (Personal Record)", def: "Any best-ever performance for a given lift. In 5/3/1, most PRs come from AMRAP sets." },
  { term: "Rep PR", def: "Beating your previous best rep count on the AMRAP set at the same working weight. Tracked per lift per cycle." },
  { term: "TM (Training Max)", def: "The weight your percentages are based on. Default: 90% of your 1RM." },
  { term: "TM Progression", def: "The scheduled increase in Training Max after each completed cycle." },
  { term: "Top Set", def: "The heaviest set of the day for a given lift. In 5/3/1's main phases, this is the AMRAP set." },
  { term: "Warm-up Sets", def: "Lighter sets before working sets to prepare the body." },
  { term: "Working Sets", def: "The main sets where the primary training stimulus occurs." },
];

const LEARN_MORE_LINKS: { label: string; desc: string; url: string }[] = [
  {
    label: "5/3/1: The Simplest and Most Effective Training System for Raw Strength",
    desc: "Jim Wendler — the foundational text where 5/3/1 is codified (2nd Edition)",
    url: "https://www.amazon.com/dp/B00686OYGQ?tag=profpeptide-20",
  },
];

function SubAccordion({
  title,
  open,
  onToggle,
  theme,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.subSection, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onToggle} style={styles.subHeader} activeOpacity={0.7}>
        <Text style={[styles.subTitle, { color: theme.accent }]}>{title.toUpperCase()}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </TouchableOpacity>
      {open && <View style={[styles.subBody, { borderTopColor: theme.border }]}>{children}</View>}
    </View>
  );
}

export function ProgramGuide({ theme }: { theme: Theme }) {
  const [expanded, setExpanded] = useState<SectionKey | null>("overview");
  const [liftSub, setLiftSub] = useState<string | null>(null);
  const [weekSub, setWeekSub] = useState<string | null>(null);
  const [techSub, setTechSub] = useState<string | null>(null);

  const toggle = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((cur) => (cur === key ? null : key));
  };

  const toggleSub = <T extends string | null>(setter: React.Dispatch<React.SetStateAction<T>>, val: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((cur) => (cur === val ? null : val) as T);
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
                    5/3/1 is a strength training methodology built around four main barbell lifts. It uses percentage-based loading to drive slow, consistent progress over time. The core philosophy: start lighter than you think you need to, progress slowly, and focus on long-term strength gains.
                  </Text>
                )}

                {key === "lifts" && (
                  <View style={styles.subWrap}>
                    {LIFT_DESCRIPTIONS.map((l) => (
                      <SubAccordion
                        key={l.lift}
                        title={l.lift}
                        open={liftSub === l.lift}
                        onToggle={() => toggleSub(setLiftSub, l.lift)}
                        theme={theme}
                      >
                        {l.body.map((p, i) => (
                          <Text key={i} style={[styles.para, body, i > 0 && { marginTop: spacing.sm }]}>{p}</Text>
                        ))}
                      </SubAccordion>
                    ))}
                  </View>
                )}

                {key === "trainingMax" && (
                  <Text style={[styles.para, body]}>
                    Your Training Max is NOT your true 1 Rep Max. It is the weight all percentages are calculated from. Default is 90% of your 1RM. Starting conservative allows you to build momentum and avoid stalling early.
                  </Text>
                )}

                {key === "cycle" && (
                  <View style={styles.subWrap}>
                    {WEEK_DESCRIPTIONS.map((w) => (
                      <SubAccordion
                        key={w.week}
                        title={w.week}
                        open={weekSub === w.week}
                        onToggle={() => toggleSub(setWeekSub, w.week)}
                        theme={theme}
                      >
                        {w.rows.map((r, i) => (
                          <Text key={i} style={[styles.line, body]}>{r}</Text>
                        ))}
                        {w.note && <Text style={[styles.hint, { color: theme.textSecondary }]}>{w.note}</Text>}
                      </SubAccordion>
                    ))}
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
                  <View style={styles.subWrap}>
                    {TECHNIQUE.map((t) => (
                      <SubAccordion
                        key={t.lift}
                        title={t.lift}
                        open={techSub === t.lift}
                        onToggle={() => toggleSub(setTechSub, t.lift)}
                        theme={theme}
                      >
                        <Text style={[styles.techLabel, { color: theme.text }]}>Setup</Text>
                        {t.setup.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                        <Text style={[styles.techLabel, { color: theme.text }]}>Execution</Text>
                        {t.execution.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                        <Text style={[styles.techLabel, { color: theme.text }]}>Common mistakes</Text>
                        {t.mistakes.map((s, i) => <Text key={i} style={[styles.bullet, body]}>•  {s}</Text>)}
                      </SubAccordion>
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

                {key === "learnMore" && (
                  <View>
                    {LEARN_MORE_LINKS.map((l) => (
                      <TouchableOpacity
                        key={l.url}
                        onPress={() => Linking.openURL(l.url)}
                        style={[styles.linkRow, { borderBottomColor: theme.border }]}
                        activeOpacity={0.7}
                        accessibilityRole="link"
                        accessibilityLabel={`${l.label} — ${l.desc}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.linkLabel, { color: theme.text }]}>{l.label}</Text>
                          <Text style={[styles.linkDesc, { color: theme.textSecondary }]}>{l.desc}</Text>
                        </View>
                        <Ionicons name="open-outline" size={16} color={theme.accent} />
                      </TouchableOpacity>
                    ))}
                    <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
                      Educational content only. Consult a qualified coach for personalized form feedback.
                    </Text>
                    <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
                      Strength Cycle is an independent training tool. 5/3/1 is an established programming methodology. Not affiliated with any program creator referenced. Use of this app is for personal training tracking purposes only.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
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
  hint: { fontSize: 12, marginTop: spacing.sm, fontStyle: "italic" },
  techLabel: { fontSize: 13, fontWeight: "800", marginTop: spacing.sm, marginBottom: 2 },
  glossEntry: { marginBottom: spacing.sm + 2 },
  glossTerm: { fontSize: 14, fontWeight: "800" },
  glossDef: { fontSize: 13, lineHeight: 19, marginTop: 1 },
  disclaimer: { fontSize: 12, fontStyle: "italic", marginTop: spacing.md, opacity: 0.75 },
  linkRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  linkLabel: { fontSize: 14, fontWeight: "700" },
  linkDesc: { fontSize: 12, marginTop: 2 },
  subWrap: { marginLeft: 12, gap: spacing.sm },
  subSection: { borderWidth: 1, borderRadius: borderRadius.sm, overflow: "hidden" },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm + 2 },
  subTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7 },
  subBody: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm + 2, borderTopWidth: 1 },
});
