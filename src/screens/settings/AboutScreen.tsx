import React from "react";
import StaticInfoScreen from "../../components/StaticInfoScreen";

export default function AboutScreen() {
  return (
    <StaticInfoScreen
      sections={[
        {
          body: "Bones & Beasts is a memory/dice hybrid game — roll to find your beast, then hunt for it across the tablet before the skulls (or someone else's beast) catch you.",
        },
        {
          heading: "How to play",
          body: "Solo mode is just you against the tablet: roll for a fixed target animal, then flip tiles to collect all of its copies before another animal's set gets fully revealed first. Group mode matches 2-4 players online, racing to complete their own sets — with bonus gems and idols along the way that instantly reveal extra copies for whoever finds them.",
        },
        {
          heading: "Built with",
          body: "Expo, React Native, and TypeScript on the client; Colyseus powers real-time online Group play.",
        },
        {
          heading: "Version",
          body: "1.0.0",
        },
        {
          heading: "A note",
          body: "This is an independent, actively-developed project — expect new features and rule tweaks over time. Thanks for playing!",
        },
      ]}
    />
  );
}
