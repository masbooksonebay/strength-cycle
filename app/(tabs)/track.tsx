import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useApp } from "../../lib/context";
import { spacing } from "../../constants/theme";
import { Segmented } from "../../components/track/Segmented";
import { HistorySubview } from "../../components/track/HistorySubview";
import { ProgressSubview } from "../../components/track/ProgressSubview";

type Seg = "history" | "progress";

export default function TrackScreen() {
  const { theme } = useApp();
  const [seg, setSeg] = useState<Seg>("history");

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.segWrap}>
        <Segmented
          value={seg}
          onChange={setSeg}
          theme={theme}
          options={[
            { key: "history", label: "History" },
            { key: "progress", label: "Progress" },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {seg === "history" && <HistorySubview />}
        {seg === "progress" && <ProgressSubview />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
});
