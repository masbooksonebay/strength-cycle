/*
 * Chat input layout — iMessage-style pill:
 *
 *   [ disclaimer line, centered, 11pt secondary text ]
 *   ┌──────────────────────────────────────────────┐   ← pill container
 *   │  Ask Coach anything about 5/3/1...     ( ↑ ) │     • marginH 12, marginB 8
 *   └──────────────────────────────────────────────┘     • radius 22, bg #1C1C1E
 *        12pt inset                 4pt → 28pt red       • padL 12, padR 4, padV 8
 *        from screen edge           circle send
 *   ──── keyboard top (≈8pt gap above keyboard) ────
 *
 * keyboardVerticalOffset=0 on iOS: the screen sits inside the bottom-tabs
 * navigator which already reserves tabBarHeight at the bottom, so KAV sees
 * distanceFromBottom = tabBarHeight and naturally aligns content to keyboard
 * top without extra offset.
 */

import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StyleSheet,
  Keyboard,
  Platform,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetch as expoFetch } from "expo/fetch";
import { useApp } from "../../lib/context";
import { Segmented } from "../../components/track/Segmented";
import { calcTM } from "../../lib/program";
import { spacing, borderRadius } from "../../constants/theme";

const ASK_COACH_API_URL = "https://hybrid-rockstar-api.vercel.app/api/ask-coach";
const CONNECT_ERROR_MESSAGE = "Can't reach Coach right now. Check your connection and try again.";
const PILL_BG = "#1C1C1E";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = "chat" | "rules";
interface Message { role: "user" | "assistant"; content: string }

interface RecentAmrap {
  lift: string;
  weight: number;
  reps: number;
  date: string;
}

interface AskCoachContext {
  currentTMs: Record<string, number>;
  cycleNumber: number;
  cyclePhase: string;
  recentAmraps: RecentAmrap[];
  unit: string;
}

const RULES_SECTIONS: { title: string; body: string }[] = [
  {
    title: "TRAINING MAX (TM) — WHAT IT IS",
    body:
      "TM is the weight you base all your 5/3/1 calculations on. It's typically 90% of your true 1RM — start there, or go lower (85% or even 80%) if you're unsure. A lower starting TM means faster early progress and less risk of stalling. Your TM increases at the start of each new cycle: +5 lbs upper body (bench, overhead press), +10 lbs lower body (squat, deadlift).",
  },
  {
    title: "THE 4-WEEK CYCLE",
    body:
      "Week 1 (5/5/5): 65%, 75%, 85% of TM for 5+ reps on top set\nWeek 2 (3/3/3): 70%, 80%, 90% for 3+ reps on top set\nWeek 3 (5/3/1): 75%, 85%, 95% for 1+ reps on top set\nWeek 4 (Deload): 40%, 50%, 60% for 5 reps — mandatory recovery",
  },
  {
    title: "AMRAP EXPLAINED",
    body:
      "AMRAP = As Many Reps As Possible on the top set of weeks 1-3. This is the only set where performance varies — sets 1-4 are prescribed. Your AMRAP rep count is the only metric worth tracking. Push for clean reps, stop before form breaks down.",
  },
  {
    title: "TM RESET TRIGGERS",
    body:
      "Reset your TM when:\n- You miss reps on an AMRAP (below 5 reps on week 1, below 3 on week 2, or failing the prescribed rep on week 3)\n- You stall for two cycles in a row\n- You're starting a new program or cycle block\n\nTo reset: drop TM by 10% and rebuild.",
  },
  {
    title: "ASSISTANCE TEMPLATES",
    body:
      "BBB (Boring But Big): 5x10 at 50-60% TM, same lift as main\nFSL (First Set Last): Repeat the first working set weight for 3-5 sets of 5\nTriumvirate: 2 assistance lifts per main lift session\nBoring But Strong: Heavier BBB variant\nJokers: Add 5-10% above your top set after completing prescribed reps\n5's PRO: Just do prescribed reps, no AMRAP — for mass phases",
  },
  {
    title: "WENDLER'S BOOKS",
    body:
      "Jim Wendler has published multiple editions of 5/3/1. Most modern lifters reference:\n- 5/3/1 Forever (2017) — the most comprehensive and current\n- 5/3/1: 2nd Edition (updated)\n- 5/3/1: Beyond (2012)\n- 5/3/1 (2008, original)\n\nForever is the recommended starting point for new readers.",
  },
];

export default function AskCoachScreen() {
  const { data, theme } = useApp();
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const buildContext = (): AskCoachContext => {
    const tmPct = data.settings.tmPercentage;
    const currentTMs: Record<string, number> = {};
    for (const lift of data.lifts) {
      currentTMs[lift.name] = lift.trainingMax ?? calcTM(lift.oneRepMax, tmPct);
    }
    const amrapWorkouts = [...data.workouts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((w) => w.sets.some((s) => s.isAmrap && s.actualReps > 0));
    const recentAmraps: RecentAmrap[] = amrapWorkouts.slice(0, 3).map((w) => {
      const top = w.sets.find((s) => s.isAmrap && s.actualReps > 0)!;
      return { lift: w.exercise, weight: top.weight, reps: top.actualReps, date: w.date };
    });
    const cyclePhase = amrapWorkouts[0]?.week ?? "5/5/5";
    const unit = data.settings.units === "lb" ? "lbs" : "kg";
    return { currentTMs, cycleNumber: data.currentCycle, cyclePhase, recentAmraps, unit };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const baseMessages = [...messages, userMsg];
    setMessages(baseMessages);
    setInput("");

    const showError = (log: string) => {
      console.error(`[AskCoach] ${log}`);
      setMessages([...baseMessages, { role: "assistant", content: CONNECT_ERROR_MESSAGE }]);
    };

    try {
      const res = await expoFetch(ASK_COACH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: baseMessages.map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      });

      if (!res.ok) {
        let errCode = "unknown";
        let errMsg = "";
        try {
          const body = await res.json();
          errCode = body?.error?.code ?? errCode;
          errMsg = body?.error?.message ?? "";
        } catch {}
        showError(`Proxy ${res.status} ${errCode}: ${errMsg}`);
        return;
      }

      if (!res.body) {
        showError("Empty response body");
        return;
      }

      setMessages([...baseMessages, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let assembled = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIdx = buffer.indexOf("\n\n");
        while (sepIdx !== -1) {
          const frame = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          sepIdx = buffer.indexOf("\n\n");

          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload);
              if (evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta") {
                const chunk = evt.delta.text as string;
                if (chunk) {
                  assembled += chunk;
                  const snapshot = assembled;
                  setMessages((prev) => {
                    const next = prev.slice();
                    const last = next[next.length - 1];
                    if (last && last.role === "assistant") {
                      next[next.length - 1] = { role: "assistant", content: snapshot };
                    }
                    return next;
                  });
                }
              }
            } catch {}
          }
        }
      }

      if (!assembled) {
        showError("Stream ended with no text");
        return;
      }
    } catch (err) {
      showError(`Network / fetch error: ${String(err)}`);
      return;
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.segWrap}>
          <Segmented
            value={tab}
            onChange={setTab}
            theme={theme}
            options={[
              { key: "chat" as Tab, label: "Chat" },
              { key: "rules" as Tab, label: "Guide" },
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

      {tab === "chat" ? (
        <ChatView
          theme={theme}
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          scrollRef={scrollRef}
        />
      ) : (
        <RulesView theme={theme} />
      )}
    </KeyboardAvoidingView>
  );
}

function ChatView({
  theme,
  messages,
  input,
  setInput,
  sendMessage,
  scrollRef,
}: {
  theme: any;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: (text: string) => void;
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const canSend = input.trim().length > 0;
  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={40} color={theme.textSecondary} style={{ marginBottom: spacing.md }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Ask Coach anything about 5/3/1 — training max management, AMRAP interpretation, assistance templates, deload decisions, or programming questions.
            </Text>
          </View>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === "user"
                  ? { backgroundColor: theme.accent, alignSelf: "flex-end" }
                  : { backgroundColor: theme.card, alignSelf: "flex-start", borderWidth: 1, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.bubbleText, { color: m.role === "user" ? "#fff" : theme.text }]}>{m.content}</Text>
            </View>
          ))
        )}
        <View style={{ height: 12 }} />
      </ScrollView>

      <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
        Informational only. Consult a qualified coach or medical professional for personalized advice.
      </Text>

      <View style={[styles.inputPill, { backgroundColor: PILL_BG }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Ask Coach anything about 5/3/1..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="default"
          multiline={false}
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="sentences"
        />
        <TouchableOpacity
          onPress={() => sendMessage(input)}
          disabled={!canSend}
          hitSlop={8}
          style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: canSend ? 1 : 0.4 }]}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function RulesView({ theme }: { theme: any }) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenMap((m) => ({ ...m, [title]: !m[title] }));
  };
  return (
    <ScrollView contentContainerStyle={styles.rulesContent} keyboardDismissMode="on-drag">
      <Text style={[styles.rulesNote, { color: theme.textSecondary }]}>
        5/3/1 reference — tap any section to expand.
      </Text>
      {RULES_SECTIONS.map((section) => {
        const open = !!openMap[section.title];
        return (
          <View key={section.title} style={[styles.ruleSection, { borderBottomColor: theme.border }]}>
            <TouchableOpacity style={styles.ruleSectionHeader} onPress={() => toggle(section.title)} activeOpacity={0.7}>
              <Text style={[styles.ruleSectionTitle, { color: theme.text }]}>{section.title}</Text>
              <Ionicons name={open ? "remove" : "add"} size={20} color={theme.accent} />
            </TouchableOpacity>
            {open && (
              <View style={styles.ruleSectionBody}>
                <Text style={[styles.ruleBody, { color: theme.textSecondary }]}>{section.body}</Text>
              </View>
            )}
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },

  chatScroll: { flex: 1 },
  chatContent: { padding: spacing.md, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  bubble: { maxWidth: "80%", borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  bubbleText: { fontSize: 15, lineHeight: 22 },

  disclaimer: { fontSize: 11, textAlign: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },

  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 4 },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  rulesContent: { padding: spacing.md },
  rulesNote: { fontSize: 11, textAlign: "center", marginBottom: spacing.md },
  ruleSection: { borderBottomWidth: 0.5 },
  ruleSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  ruleSectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 0.3, flex: 1, paddingRight: spacing.sm },
  ruleSectionBody: { paddingBottom: spacing.md },
  ruleBody: { fontSize: 13, lineHeight: 20 },
});
