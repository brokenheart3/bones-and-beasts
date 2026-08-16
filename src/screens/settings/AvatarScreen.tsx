import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../../theme";
import { useAuthStore } from "../../store/useAuthStore";
import { AVATARS, avatarIdFromPhotoURL, photoURLFromAvatarId } from "../../utils/avatars";

interface Props {
  onDone?: () => void;
}

// A closed set of preset avatars (the game's own animal cast) rather than a
// photo picker — no camera roll access, no image upload/storage needed.
// Tapping a choice saves immediately via updatePhotoURL and returns.
export default function AvatarScreen({ onDone }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const busy = useAuthStore((s) => s.busy);
  const updatePhotoURL = useAuthStore((s) => s.updatePhotoURL);
  const currentId = avatarIdFromPhotoURL(user?.photoURL);

  const handleSelect = async (id: (typeof AVATARS)[number]["id"]) => {
    try {
      await updatePhotoURL(photoURLFromAvatarId(id));
      onDone?.();
    } catch {
      // error already surfaced via the store
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.subtitle}>{t("avatar.subtitle")}</Text>
      <View style={styles.grid}>
        {AVATARS.map((a) => {
          const selected = currentId === a.id;
          return (
            <Pressable
              key={a.id}
              style={[styles.avatarCircle, selected && styles.avatarCircleSelected]}
              onPress={() => handleSelect(a.id)}
              disabled={busy}
            >
              <Text style={styles.avatarEmoji}>{a.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
      alignItems: "center",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 24,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 16,
      maxWidth: 360,
    },
    avatarCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarCircleSelected: {
      borderColor: theme.colors.gold,
      backgroundColor: theme.colors.accentTint,
    },
    avatarEmoji: {
      fontSize: 40,
    },
  });
}
