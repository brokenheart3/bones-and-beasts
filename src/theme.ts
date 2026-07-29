import { useSettingsStore } from "./store/useSettingsStore";

// Design tokens for the "Temple Memory" look: a jungle-temple / carved-
// stone-tablet aesthetic. Two variants share this file — "dark" (the
// original night-temple look) and "light" (the same temple by day).
//
// Design rule: the carved-stone/gold "game pieces" (tiles, dice, buttons,
// accent colors — stone*, gold*, moss, danger*, textDark, textOnAccent)
// stay the same real-world material color in both variants, exactly like a
// physical stone tablet doesn't change color between day and night. Only
// the *ambient scene* around them — page background, panels, and general
// body text — actually inverts between the two.
export type ThemeMode = "dark" | "light";

interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  textLight: string;
  textMuted: string;
  goldSoft: string;
  dangerSoft: string;
  gold: string;
  accentTint: string; // subtle gold-wash highlight for the "current target" row

  // Constant "game piece" colors — same value in both modes.
  moss: string;
  danger: string;
  stone: string;
  stoneShadow: string;
  stoneBack: string;
  stoneBackBorder: string;
  dangerTileBg: string;
  bonusTileBg: string;
  textDark: string;
  textOnAccent: string;
}

const darkColors: ThemeColors = {
  background: "#16241F", // deep jungle green, near-black
  surface: "#20342C", // panel / header surface
  surfaceAlt: "#2A4438",
  textLight: "#F4EFDE",
  textMuted: "#B9C6BC",
  goldSoft: "#E4C665",
  dangerSoft: "#C97A7A",
  gold: "#C9A227", // aged gold accent (dice, highlights)
  accentTint: "#3A3221",

  moss: "#4C8B71",
  danger: "#9C3B3B", // muted blood red (skull / penalty)
  stone: "#E9DCC0", // parchment-stone tile face
  stoneShadow: "#C7B98F",
  stoneBack: "#3B5245", // hidden tile back (mossy stone)
  stoneBackBorder: "#243D32",
  dangerTileBg: "#E7D4C7",
  bonusTileBg: "#3A3221",
  textDark: "#16241F",
  textOnAccent: "#F4EFDE",
};

const lightColors: ThemeColors = {
  background: "#F1E6C9", // sunlit sandstone courtyard
  surface: "#E4D5AA",
  surfaceAlt: "#D6C08A",
  textLight: "#16241F", // same ink as the dark theme's background — a deliberate mirror
  textMuted: "#5C5340",
  goldSoft: "#7A5D16", // deepened so it still reads against light surfaces
  dangerSoft: "#8B3030",
  gold: "#9C7A1C",
  accentTint: "#F0DFA0",

  // Unchanged from dark — the physical stone/gold/dice pieces don't change color.
  moss: "#4C8B71",
  danger: "#9C3B3B",
  stone: "#E9DCC0",
  stoneShadow: "#C7B98F",
  stoneBack: "#3B5245",
  stoneBackBorder: "#243D32",
  dangerTileBg: "#E7D4C7",
  bonusTileBg: "#3A3221",
  textDark: "#16241F",
  textOnAccent: "#F4EFDE",
};

function buildTheme(mode: ThemeMode) {
  return {
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    radius: {
      sm: 6,
      md: 12,
      lg: 20,
    },
    spacing: (n: number) => n * 4,
  };
}

export type Theme = ReturnType<typeof buildTheme>;

// Every screen/component reads the theme through this hook so it re-renders
// live when the player flips the Light/Dark setting — there's no static
// `theme` export, since that would silently freeze at whatever mode was
// active on first import.
export function useTheme(): Theme {
  const mode = useSettingsStore((s) => s.themeMode);
  return buildTheme(mode);
}
