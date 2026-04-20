import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { borderRadius, spacing } from "../../constants/theme";

export function Segmented<T extends string>({ options, value, onChange, theme }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  theme: any;
}) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity key={o.key} style={[styles.opt, active && { backgroundColor: theme.accent }]} onPress={() => onChange(o.key)} activeOpacity={0.8}>
            <Text style={[styles.text, { color: active ? "#fff" : theme.text }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderWidth: 1, borderRadius: borderRadius.sm, padding: 3, gap: 3 },
  opt: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.sm - 2, alignItems: "center" },
  text: { fontSize: 13, fontWeight: "700" },
});
