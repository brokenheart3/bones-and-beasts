import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";

export interface StaticInfoSection {
  heading?: string;
  body: string;
}

interface Props {
  sections: StaticInfoSection[];
  updated?: string; // e.g. "July 29, 2026" — shown as a small note at the top
}

// The screen title is shown by the enclosing stack navigator's header, so
// this only renders the body copy.
export default function StaticInfoScreen({ sections, updated }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {updated && <Text style={styles.updated}>Last updated: {updated}</Text>}
      {sections.map((s, i) => (
        <View key={i} style={styles.section}>
          {s.heading && <Text style={styles.heading}>{s.heading}</Text>}
          <Text style={styles.paragraph}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
      alignItems: "center",
    },
    updated: {
      width: "100%",
      maxWidth: 520,
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
      marginBottom: 16,
    },
    section: {
      width: "100%",
      maxWidth: 520,
      marginBottom: 16,
    },
    heading: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.goldSoft,
      marginBottom: 6,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textLight,
    },
  });
}
