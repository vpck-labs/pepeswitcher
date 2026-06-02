// Helpers for capturing and displaying global-shortcut accelerators.

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
]);

/**
 * Build an accelerator string (e.g. "Control+Alt+Digit1") from a key event,
 * matching the format the global-shortcut plugin parses. Returns null while
 * only modifiers are held or no modifier is present (global hotkeys need one).
 */
export function accelFromEvent(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (MODIFIER_CODES.has(e.code)) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Control");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Super");
  if (mods.length === 0) return null;
  return [...mods, e.code].join("+");
}

/** "Control+Alt+Digit1" -> "Ctrl + Alt + 1" */
export function prettyAccel(accel: string): string {
  return accel
    .split("+")
    .map((part) => {
      if (part === "Control") return "Ctrl";
      if (part === "Super") return "Win";
      return part
        .replace(/^Digit/, "")
        .replace(/^Key/, "")
        .replace(/^Numpad/, "Num ");
    })
    .join(" + ");
}
