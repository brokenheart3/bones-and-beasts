import React from "react";
import StaticInfoScreen from "../../components/StaticInfoScreen";

// Plain-language terms reflecting how the app actually works today — not
// reviewed by a lawyer, so treat this as an honest draft rather than final
// legal copy.
export default function TermsOfServiceScreen() {
  return (
    <StaticInfoScreen
      updated="July 29, 2026"
      sections={[
        {
          body: "By using Bones & Beasts, you agree to these terms. If you don't agree, please don't use the app.",
        },
        {
          heading: "The game",
          body: "Bones & Beasts is a memory/dice hybrid game offered for entertainment purposes only. It includes a local Solo mode and an online Group mode that matches you with other players in a live lobby.",
        },
        {
          heading: "Fair play",
          body: "In Group games, please play fairly — no exploiting bugs, automating your turns, or disrupting other players' games. We reserve the right to remove players from a game or lobby for disruptive behavior.",
        },
        {
          heading: "No warranty",
          body: "The app is provided \"as is,\" without warranties of any kind. We don't guarantee it will be uninterrupted, error-free, or available at all times — especially the online Group mode, which depends on a game server that may be updated, restarted, or taken offline without notice.",
        },
        {
          heading: "Limitation of liability",
          body: "To the fullest extent permitted by law, we aren't liable for any damages arising from your use of, or inability to use, the app.",
        },
        {
          heading: "Changes",
          body: "These terms may be updated as the app changes. Continuing to use the app after an update means you accept the revised terms.",
        },
      ]}
    />
  );
}
