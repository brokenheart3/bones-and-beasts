import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Theme, useTheme } from "../../theme";
import { useProfileStore } from "../../store/useProfileStore";

interface Props {
  isOnboarding?: boolean;
  onDone?: () => void;
}

export default function ProfileScreen({ isOnboarding, onDone }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const username = useProfileStore((s) => s.username);
  const setUsername = useProfileStore((s) => s.setUsername);
  const [draft, setDraft] = useState(username ?? "");

  const canSave = draft.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    setUsername(draft);
    onDone?.();
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {isOnboarding && (
        <>
          <Text style={styles.title}>Bones & Beasts</Text>
          <Text style={styles.subtitle}>
            What should we call you, explorer?
          </Text>
        </>
      )}
      <View style={styles.form}>
        {!isOnboarding && <Text style={styles.label}>Username</Text>}

        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Your name"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={save}
        />

        <Pressable
          style={[styles.btn, !canSave && styles.btnDisabled]}
          onPress={save}
          disabled={!canSave}
        >
          <Text style={styles.btnText}>{isOnboarding ? "Get Started" : "Save"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 8,
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginBottom: 28,
    },
    form: {
      width: "100%",
      maxWidth: 400,
      alignItems: "center",
    },
    label: {
      alignSelf: "flex-start",
      color: theme.colors.textLight,
      fontSize: 13,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    input: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.surfaceAlt,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.textLight,
      marginBottom: 20,
    },
    btn: {
      backgroundColor: theme.colors.moss,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.radius.md,
    },
    btnDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    btnText: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
