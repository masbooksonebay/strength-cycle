import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, Theme } from "../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey =
  | "origin"
  | "schedule"
  | "volume"
  | "recovery"
  | "intensity"
  | "alternation"
  | "progression"
  | "stalls"
  | "glossary"
  | "learnMore";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "origin", title: "Origin" },
  { key: "schedule", title: "Weekly Schedule" },
  { key: "volume", title: "Volume Day" },
  { key: "recovery", title: "Recovery Day" },
  { key: "intensity", title: "Intensity Day" },
  { key: "alternation", title: "Bench / Press Alternation" },
  { key: "progression", title: "Progression" },
  { key: "stalls", title: "Stall Protocol" },
  { key: "glossary", title: "Glossary" },
  { key: "learnMore", title: "Learn More" },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "5RM (5 Rep Max)", def: "The heaviest weight you can lift for 5 clean reps. The Texas Method's primary training metric." },
  { term: "Volume Day", def: "Monday's session: high-volume work at 90% of last Friday's 5RM. Builds the work capacity that supports Friday's PR." },
  { term: "Recovery Day", def: "Wednesday's session: light squat, secondary upper-body work, accessory pulls. Manages fatigue between Volume and Intensity." },
  { term: "Intensity Day", def: "Friday's session: a single 5-rep PR attempt at a new weight, drawing on Monday's volume. The week's barometer." },
  { term: "Alternation", def: "Bench Press and Overhead Press alternate week-by-week as the main upper-body lift. Each gets a PR attempt every two weeks." },
  { term: "Stall", def: "Logging fewer than 5 reps on the Intensity Day work set. The Texas Method has a defined response protocol — see below." },
];

const LEARN_MORE_LINKS: { label: string; desc: string; url: string }[] = [
  { label: "Practical Programming for Strength Training", desc: "Rippetoe & Kilgore — the foundational text where the Texas Method is codified", url: "https://aasgaardco.com/store/books-posters-dvd/books/practical-programming-for-strength-training-3rd-edition/" },
  { label: "Starting Strength wiki — Texas Method", desc: "Community-maintained reference with sample weeks", url: "https://startingstrength.com/training/the-texas-method-program-design" },
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

export function TexasMethodGuide({ theme }: { theme: Theme }) {
  const [expanded, setExpanded] = useState<SectionKey | null>("origin");

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
                {key === "origin" && (
                  <Text style={[styles.para, body]}>
                    The Texas Method is codified in Practical Programming for Strength Training (Rippetoe & Kilgore). It descends from Bill Starr's heavy-light-medium template and was named for its association with strength gyms in Texas. It is a post-novice intermediate program: a single hard PR attempt each week, supported by one heavy volume day and one recovery session.
                  </Text>
                )}

                {key === "schedule" && (
                  <View>
                    <Text style={[styles.para, body]}>Three sessions per week, traditionally Mon / Wed / Fri:</Text>
                    <Text style={[styles.bullet, body]}>•  Monday — Volume Day (5×5 across at 90% 5RM)</Text>
                    <Text style={[styles.bullet, body]}>•  Wednesday — Recovery Day (light squat + opposite upper body)</Text>
                    <Text style={[styles.bullet, body]}>•  Friday — Intensity Day (1×5 PR attempt at a new 5RM)</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Don't add days. Don't skip Recovery Day — it's a load, not a rest.</Text>
                  </View>
                )}

                {key === "volume" && (
                  <View>
                    <Text style={[styles.para, body]}>Monday's high-volume session uses last Friday's 5RM as the reference weight:</Text>
                    <Text style={[styles.bullet, body]}>•  Squat — 5×5 @ 90% of current 5RM</Text>
                    <Text style={[styles.bullet, body]}>•  Bench / Press (this week's main) — 5×5 @ 90% of current 5RM</Text>
                    <Text style={[styles.bullet, body]}>•  Deadlift — 1×5 @ 80% of current 5RM (supplementary)</Text>
                    <Text style={[styles.bullet, body]}>•  Power Cleans — 5×3 (optional, toggle in workout header)</Text>
                  </View>
                )}

                {key === "recovery" && (
                  <View>
                    <Text style={[styles.para, body]}>Wednesday is light squat plus the off-week upper-body lift:</Text>
                    <Text style={[styles.bullet, body]}>•  Squat — 2×5 @ 80% of Monday's volume weight</Text>
                    <Text style={[styles.bullet, body]}>•  Off-week upper body — 3×5 light (the lift not getting Friday's PR)</Text>
                    <Text style={[styles.bullet, body]}>•  Chin-ups — 3 sets to AMRAP (bodyweight)</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Recovery Day exists to manage fatigue — keep weights light enough to leave the gym fresher than you arrived.</Text>
                  </View>
                )}

                {key === "intensity" && (
                  <View>
                    <Text style={[styles.para, body]}>Friday is a single 5-rep PR attempt at a new top weight:</Text>
                    <Text style={[styles.bullet, body]}>•  Squat — 1×5 attempting a new 5RM</Text>
                    <Text style={[styles.bullet, body]}>•  Bench / Press (this week's main) — 1×5 attempting a new 5RM</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>The PR attempt is supposed to be hard. Reps below 5 trigger the stall protocol.</Text>
                  </View>
                )}

                {key === "alternation" && (
                  <View>
                    <Text style={[styles.para, body]}>Bench Press and Overhead Press alternate week-by-week as the main upper-body lift. Each gets a PR attempt every two weeks. The "off-week" lift is trained light on Recovery Day and skipped on Volume / Intensity.</Text>
                    <Text style={[styles.bullet, body]}>•  Odd weeks (1, 3, 5...) — Bench is main</Text>
                    <Text style={[styles.bullet, body]}>•  Even weeks (2, 4, 6...) — Overhead Press is main</Text>
                  </View>
                )}

                {key === "progression" && (
                  <View>
                    <Text style={[styles.para, body]}>After a successful Intensity Day (5+ clean reps on the PR set), the 5RM target moves up:</Text>
                    <Text style={[styles.bullet, body]}>•  Squat — +5 lbs / +2.5 kg</Text>
                    <Text style={[styles.bullet, body]}>•  Bench / Press — +5 lbs / +2.5 kg (every two weeks per lift, due to alternation)</Text>
                    <Text style={[styles.bullet, body]}>•  Deadlift — +5 lbs / +2.5 kg every week (independent of upper-body alternation)</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Micro-loading (smaller jumps) becomes appropriate for upper-body lifts once gross increments stop landing cleanly.</Text>
                  </View>
                )}

                {key === "stalls" && (
                  <View>
                    <Text style={[styles.para, body]}>Logging fewer than 5 reps on the Intensity Day work set is a stall. Strength Cycle prompts three responses:</Text>
                    <Text style={[styles.bullet, body]}>•  Repeat next week — re-attempt the same weight</Text>
                    <Text style={[styles.bullet, body]}>•  Reduce volume 10% — same intensity target, lighter Volume Day</Text>
                    <Text style={[styles.bullet, body]}>•  Deload to 85% — drop the 5RM and rebuild over 2-3 weeks</Text>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Most stalls on Texas Method are recovery problems, not programming problems. Sleep, eat, then change the program.</Text>
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
                      Strength Cycle is an independent training tool. The Texas Method is an established programming methodology. Not affiliated with any program creator referenced. Use of this app is for personal training tracking purposes only.
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
  subSection: { borderWidth: 1, borderRadius: borderRadius.sm, overflow: "hidden" },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm + 2 },
  subTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7 },
  subBody: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm + 2, borderTopWidth: 1 },
});
