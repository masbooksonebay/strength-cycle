import { forwardRef, useId, useState } from "react";
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

export const DoneKeyboardToolbar = forwardRef<TextInput, Props>(function DoneKeyboardToolbar(
  { doneLabel = "Done", onFocus, onBlur, ...rest },
  ref,
) {
  const { data, theme } = useApp();
  const keyboardAppearance = data.settings.darkMode ? "dark" : "light";
  const rawId = useId();
  const accessoryID = `sc-done-toolbar-${rawId.replace(/:/g, "")}`;
  // The InputAccessoryView is mounted ONLY while this input is focused. A
  // permanently-mounted InputAccessoryView lingers as a stray "Done" bar pinned
  // to the bottom of the screen after the keyboard hides; gating it on focus
  // state guarantees it leaves the tree the moment the input blurs.
  const [focused, setFocused] = useState(false);

  if (Platform.OS !== "ios") {
    return <TextInput ref={ref} onFocus={onFocus} onBlur={onBlur} {...rest} />;
  }

  return (
    <>
      <TextInput
        ref={ref}
        keyboardAppearance={keyboardAppearance}
        inputAccessoryViewID={accessoryID}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {focused && (
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
      )}
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
