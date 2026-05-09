import { useApp } from "../../lib/context";
import Wendler531WorkoutScreen from "./_screens/Wendler531WorkoutScreen";
import TexasMethodWorkoutScreen from "./_screens/TexasMethodWorkoutScreen";

// Thin router. Reads activeProgram and dispatches to the per-program screen.
// Defaults to Wendler 5/3/1 for any unrecognized value (defensive — protects
// existing 1.0.2 users if migration somehow misses).
export default function WorkoutTab() {
  const { data } = useApp();
  if (data.activeProgram === "texasMethod") return <TexasMethodWorkoutScreen />;
  return <Wendler531WorkoutScreen />;
}
