import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, Theme } from "../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mirrors TexasMethodGuide: a flat accordion of sections with inline content
// (no per-lift sub-accordions — SS has no technique sub-sections). The 5/3/1
// guide keeps its content in constants/programContent because it has per-lift
// technique data; TexasMethodGuide and this guide inline it instead, which is
// the simpler, more self-contained pattern for a guide without sub-accordions.

type SectionKey =
  | "overview"
  | "linearProgression"
  | "structure"
  | "workingWeights"
  | "deload"
  | "switching"
  | "glossary"
  | "learnMore";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "linearProgression", title: "Linear Progression" },
  { key: "structure", title: "A/B Workout Structure" },
  { key: "workingWeights", title: "Working Weights vs 1RM" },
  { key: "deload", title: "Failure & Deload" },
  { key: "switching", title: "When to Switch Programs" },
  { key: "glossary", title: "Glossary" },
  { key: "learnMore", title: "Learn More" },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Linear Progression (LP)", def: "Adding a fixed amount of weight to a lift every session. The defining feature of a novice program." },
  { term: "Working Weight", def: "The actual load on the bar for your 3x5 work sets — the source of truth in 3x5 Strength. There is no Training Max or percentage math." },
  { term: "Workout A / Workout B", def: "The two alternating full-body sessions. A = Squat / Overhead Press / Deadlift; B = Squat / Bench Press / Deadlift." },
  { term: "3x5", def: "Three sets of five reps across — the same weight on every set. The deadlift is the exception, trained at 1x5." },
  { term: "Deload", def: "After two consecutive failed sessions on a lift, dropping that lift roughly 10% and rebuilding." },
  { term: "Microloading", def: "Smaller weight jumps (2.5 lb / 1.25 kg) a lift switches to after its first deload, to extend linear progression." },
  { term: "Stall", def: "Repeated failure to progress a lift despite good recovery — the signal that novice linear progression has run its course." },
];

const LEARN_MORE_LINKS: { label: string; desc: string; url: string }[] = [
  {
    label: "Basic Barbell Training by Mark Rippetoe",
    desc: "Mark Rippetoe's foundational text on novice barbell training and linear progression (3rd Edition)",
    url: "https://www.amazon.com/dp/0982522738?tag=profpeptide-20",
  },
];

export function StartingStrengthGuide({ theme }: { theme: Theme }) {
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
                    3x5 Strength is a novice linear progression program, inspired by Mark Rippetoe's coaching work — the most efficient way for a true beginner to get strong. Two alternating full-body workouts, three days a week, adding weight to every lift every session for as long as recovery allows. It is deliberately simple: the gains come from progressive overload and consistency, not from clever programming.
                  </Text>
                )}

                {key === "linearProgression" && (
                  <View>
                    <Text style={[styles.para, body]}>The engine of the program is a small, fixed weight increase on every lift, every session:</Text>
                    <Text style={[styles.bullet, body]}>•  Every barbell lift — +5 lbs (+2.5 kg) per session</Text>
                    <Text style={[styles.bullet, body]}>•  After a lift's first deload — it switches to microloading (+2.5 lbs / +1.25 kg)</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>A novice can progress like this for months. When it stops, that's the expected end of the phase — not a failure of effort.</Text>
                  </View>
                )}

                {key === "structure" && (
                  <View>
                    <Text style={[styles.para, body]}>Two full-body workouts alternate strictly A / B / A / B, trained three non-consecutive days a week (traditionally Mon / Wed / Fri):</Text>
                    <Text style={[styles.bullet, body]}>•  Workout A — Squat, Overhead Press, Deadlift</Text>
                    <Text style={[styles.bullet, body]}>•  Workout B — Squat, Bench Press, Deadlift</Text>
                    <Text style={[styles.para, body, { marginTop: spacing.sm }]}>Every lift is 3 sets of 5 reps at one working weight. The deadlift is the exception — a single set of 5. The squat is trained every session; bench and press alternate.</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>As you advance past the ramp-up phase, Workout B's deadlift slot becomes a lighter pull — a row or power clean.</Text>
                  </View>
                )}

                {key === "workingWeights" && (
                  <View>
                    <Text style={[styles.para, body]}>
                      3x5 Strength has no Training Max, no 1 Rep Max, and no percentage math. It tracks Working Weights — the literal load on the bar for your 3x5. Last session's weight plus the increment is next session's weight.
                    </Text>
                    <Text style={[styles.para, body, { marginTop: spacing.sm }]}>
                      This is why Settings shows Working Weights for this program, where 5/3/1 and Texas Method show 1 Rep Maxes. The working weight is the program's source of truth — nothing is calculated from a max.
                    </Text>
                  </View>
                )}

                {key === "deload" && (
                  <View>
                    <Text style={[styles.para, body]}>Failing a set means not completing all 5 prescribed reps. The response is fixed:</Text>
                    <Text style={[styles.bullet, body]}>•  One failed session — normal. Repeat the same weight next time.</Text>
                    <Text style={[styles.bullet, body]}>•  Two consecutive failed sessions on a lift — deload that lift ~10% and rebuild.</Text>
                    <Text style={[styles.bullet, body]}>•  After a deload — the lift switches to microloading to extend progress.</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Deloads are per-lift. A stalled squat doesn't stop your press or deadlift from progressing.</Text>
                  </View>
                )}

                {key === "switching" && (
                  <View>
                    <Text style={[styles.para, body]}>
                      Novice linear progression is finite. When a lift stalls and deloads repeatedly even with solid food and sleep, you have used up session-to-session progress — the expected end of the novice phase, not a failure.
                    </Text>
                    <Text style={[styles.para, body, { marginTop: spacing.sm }]}>
                      The next step is an intermediate program that progresses week to week, such as the Texas Method. Strength Cycle has no automatic graduation — switch programs yourself from onboarding when linear progression is genuinely done.
                    </Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Before switching, make sure the stall is real: most early stalls are under-eating or under-sleeping, not the end of LP.</Text>
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
                      Strength Cycle is an independent training tool. 3x5 Strength is its own program, inspired by Mark Rippetoe's coaching work on novice linear progression. Not affiliated with or endorsed by any coach referenced. Use of this app is for personal training tracking purposes only.
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
  hint: { fontSize: 12, marginTop: spacing.sm, fontStyle: "italic" },
  glossEntry: { marginBottom: spacing.sm + 2 },
  glossTerm: { fontSize: 14, fontWeight: "800" },
  glossDef: { fontSize: 13, lineHeight: 19, marginTop: 1 },
  disclaimer: { fontSize: 12, fontStyle: "italic", marginTop: spacing.md, opacity: 0.75 },
  linkRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  linkLabel: { fontSize: 14, fontWeight: "700" },
  linkDesc: { fontSize: 12, marginTop: 2 },
});
