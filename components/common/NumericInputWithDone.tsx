import { forwardRef, useId } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { useApp } from "../../lib/context";
import { spacing } from "../../constants/theme";

interface Props extends TextInputProps {
  doneLabel?: string;
}

export const NumericInputWithDone = forwardRef<TextInput, Props>(function NumericInputWithDone(
  { doneLabel = "Done", ...rest },
  ref,
) {
  const { theme } = useApp();
  const rawId = useId();
  const accessoryID = `sc-num-done-${rawId.replace(/:/g, "")}`;

  if (Platform.OS !== "ios") {
    return <TextInput ref={ref} {...rest} />;
  }

  return (
    <>
      <TextInput ref={ref} inputAccessoryViewID={accessoryID} {...rest} />
      <InputAccessoryView nativeID={accessoryID}>
        <View style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            accessible
            accessibilityLabel="Done, dismiss keyboard"
            accessibilityRole="button"
            onPress={() => Keyboard.dismiss()}
            style={styles.doneBtn}
          >
            <Text style={[styles.doneText, { color: theme.accent }]}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      </InputAccessoryView>
    </>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: { paddingHorizontal: spacing.md, paddingVertical: 4 },
  doneText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
