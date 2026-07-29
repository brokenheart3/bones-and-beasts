import React from "react";
import StaticInfoScreen from "../../components/StaticInfoScreen";

// Reflects the app's actual current data handling (see README's "Solo
// rules vs. online Group rules" and net/ layer) — not reviewed by a lawyer,
// so treat this as an accurate plain-language draft rather than final
// legal copy.
export default function PrivacyPolicyScreen() {
  return (
    <StaticInfoScreen
      updated="July 29, 2026"
      sections={[
        {
          body: "This policy explains what information Bones & Beasts collects and how it's used. There are no accounts, no advertising, and no analytics or tracking of any kind.",
        },
        {
          heading: "Your username",
          body: "The name you enter on first launch is stored only on your device (using on-device storage) and is never sent anywhere unless you join an online Group game — see below.",
        },
        {
          heading: "Solo play",
          body: "Solo games run entirely on your device. Your game history in the Stats tab (games played, wins, sets completed, times) is stored locally and is never transmitted to us or anyone else.",
        },
        {
          heading: "Online Group play",
          body: "When you join a Group game, your username and your in-game actions (dice rolls, card flips) are sent to our game server so it can keep the shared board in sync for everyone in that game. This data exists only for the life of that game session — it's not saved afterward, tied to an account, sold, or shared with third parties.",
        },
        {
          heading: "Children's privacy",
          body: "Bones & Beasts is not directed at children under 13, and we do not knowingly collect information from them.",
        },
        {
          heading: "Changes to this policy",
          body: "If how the app handles data changes — for example, if accounts or persistent online history are added later — this page will be updated to describe it.",
        },
        {
          heading: "Questions",
          body: "If you have questions about this policy, please reach out through wherever you downloaded this app.",
        },
      ]}
    />
  );
}
