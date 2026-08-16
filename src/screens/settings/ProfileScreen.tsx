import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../../theme";
import { useAuthStore } from "../../store/useAuthStore";
import { usePurchasesStore } from "../../store/usePurchasesStore";
import { getCreationTime, isWithinTrial, trialDaysRemaining } from "../../utils/trial";
import { avatarIdFromPhotoURL, emojiForAvatarId } from "../../utils/avatars";

interface Props {
  isOnboarding?: boolean;
  onDone?: () => void;
  onUpgrade?: () => void;
  onEditAvatar?: () => void;
}

type Mode = "signIn" | "signUp";

export default function ProfileScreen({ isOnboarding, onDone, onUpgrade, onEditAvatar }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isPro = usePurchasesStore((s) => s.isPro);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const signOut = useAuthStore((s) => s.signOut);

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSaveName = async () => {
    try {
      await updateDisplayName(nameDraft);
      setEditingName(false);
    } catch {
      // error already surfaced via the store
    }
  };

  const handleDeleteAccount = async () => {
    setConfirmingDelete(false);
    try {
      await deleteAccount();
    } catch {
      // error already surfaced via the store
    }
  };

  // Once signed in, this screen (whether reached via onboarding or
  // Settings > Profile) just shows account info — the app is gated on
  // auth state (see App.tsx), so there's no "signed out" Settings access.
  if (user) {
    const creationTime = getCreationTime(user);
    const trialActive = isWithinTrial(creationTime);
    const daysLeft = trialDaysRemaining(creationTime);
    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.accountCard}>
            <Pressable style={styles.avatarCircle} onPress={onEditAvatar}>
              <Text style={styles.avatarEmoji}>{emojiForAvatarId(avatarIdFromPhotoURL(user.photoURL))}</Text>
            </Pressable>

            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder={t("profile.displayNamePlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                />
                <Pressable onPress={handleSaveName} disabled={busy}>
                  <Text style={styles.saveNameText}>{t("profile.save")}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingName(false)} disabled={busy}>
                  <Text style={styles.cancelNameText}>{t("profile.cancel")}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setNameDraft(user.displayName ?? "");
                  setEditingName(true);
                }}
              >
                <Text style={styles.accountName}>{user.displayName ?? t("common.explorer")} ✎</Text>
              </Pressable>
            )}

            {user.email && <Text style={styles.accountEmail}>{user.email}</Text>}

            <View style={styles.subscriptionCard}>
              {isPro ? (
                <Text style={styles.proBadge}>{t("profile.proBadge")}</Text>
              ) : (
                <>
                  <Text style={styles.trialStatus}>
                    {trialActive ? t("home.trialActive", { count: daysLeft }) : t("home.trialEnded")}
                  </Text>
                  <Pressable style={styles.upgradeBtn} onPress={onUpgrade}>
                    <Text style={styles.upgradeBtnText}>{t("profile.upgradeToPro")}</Text>
                  </Pressable>
                </>
              )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
            {busy && <ActivityIndicator color={theme.colors.gold} style={styles.accountSpinner} />}

            <Pressable style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutBtnText}>{t("profile.signOut")}</Text>
            </Pressable>

            <Pressable style={styles.deleteAccountBtn} onPress={() => setConfirmingDelete(true)}>
              <Text style={styles.deleteAccountBtnText}>{t("profile.deleteAccount")}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {confirmingDelete && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>{t("profile.confirmDeleteTitle")}</Text>
              <Text style={styles.confirmBody}>{t("profile.confirmDeleteBody")}</Text>
              <View style={styles.confirmRow}>
                <Pressable
                  style={[styles.confirmBtn, styles.confirmCancel]}
                  onPress={() => setConfirmingDelete(false)}
                >
                  <Text style={styles.confirmCancelText}>{t("profile.cancel")}</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, styles.confirmDanger]} onPress={handleDeleteAccount}>
                  <Text style={styles.confirmDangerText}>{t("profile.delete")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const submitEmail = async () => {
    try {
      if (mode === "signUp") {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onDone?.();
    } catch {
      // error already surfaced via the store
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      onDone?.();
    } catch {
      // error already surfaced via the store
    }
  };

  const handleApple = async () => {
    try {
      await signInWithApple();
      onDone?.();
    } catch {
      // error already surfaced via the store
    }
  };

  const switchMode = () => {
    clearError();
    setResetSent(false);
    setMode(mode === "signIn" ? "signUp" : "signIn");
  };

  const handleForgotPassword = async () => {
    setResetSent(false);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      // error already surfaced via the store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isOnboarding && (
          <>
            <Text style={styles.title}>{t("profile.onboardingTitle")}</Text>
            <Text style={styles.subtitle}>
              {mode === "signUp" ? t("profile.onboardingSignUpSubtitle") : t("profile.onboardingSignInSubtitle")}
            </Text>
          </>
        )}

        <View style={styles.form}>
          {mode === "signUp" && (
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("profile.displayNamePlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={20}
            />
          )}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("profile.emailPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t("profile.passwordPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            onSubmitEditing={submitEmail}
          />

          {mode === "signIn" && (
            <Pressable onPress={handleForgotPassword} style={styles.forgotPasswordBtn} disabled={busy}>
              <Text style={styles.forgotPasswordText}>{t("profile.forgotPassword")}</Text>
            </Pressable>
          )}

          {resetSent && <Text style={styles.resetSentText}>{t("profile.resetSent")}</Text>}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={submitEmail}
            disabled={!canSubmit}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.textOnAccent} />
            ) : (
              <Text style={styles.btnText}>{mode === "signUp" ? t("profile.signUp") : t("profile.signIn")}</Text>
            )}
          </Pressable>

          <Pressable onPress={switchMode} style={styles.switchModeBtn}>
            <Text style={styles.switchModeText}>
              {mode === "signUp" ? t("profile.switchToSignIn") : t("profile.switchToSignUp")}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("profile.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.googleBtn} onPress={handleGoogle} disabled={busy}>
            <Text style={styles.googleBtnText}>{t("profile.continueWithGoogle")}</Text>
          </Pressable>

          {Platform.OS === "ios" && (
            <Pressable style={styles.appleBtn} onPress={handleApple} disabled={busy}>
              <Text style={styles.appleBtnText}>{t("profile.continueWithApple")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
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
      textAlign: "center",
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
      marginBottom: 12,
    },
    errorText: {
      color: theme.colors.dangerSoft,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 12,
    },
    forgotPasswordBtn: {
      alignSelf: "flex-end",
      marginBottom: 12,
    },
    forgotPasswordText: {
      color: theme.colors.goldSoft,
      fontSize: 12,
      fontWeight: "600",
    },
    resetSentText: {
      color: theme.colors.moss,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 12,
    },
    btn: {
      width: "100%",
      alignItems: "center",
      backgroundColor: theme.colors.moss,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.radius.md,
      marginTop: 4,
    },
    btnDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    btnText: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    switchModeBtn: {
      marginTop: 14,
    },
    switchModeText: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "600",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.surfaceAlt,
    },
    dividerText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginHorizontal: 10,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    googleBtn: {
      width: "100%",
      alignItems: "center",
      backgroundColor: theme.colors.stone,
      paddingVertical: 14,
      borderRadius: theme.radius.md,
      marginBottom: 12,
    },
    googleBtnText: {
      color: theme.colors.textDark,
      fontSize: 15,
      fontWeight: "700",
    },
    appleBtn: {
      width: "100%",
      alignItems: "center",
      backgroundColor: "#000000",
      paddingVertical: 14,
      borderRadius: theme.radius.md,
    },
    appleBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    accountCard: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 24,
      alignItems: "center",
    },
    avatarCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 2,
      borderColor: theme.colors.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatarEmoji: {
      fontSize: 40,
    },
    accountName: {
      color: theme.colors.textLight,
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 4,
    },
    editNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 4,
    },
    nameInput: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      color: theme.colors.textLight,
      minWidth: 140,
    },
    saveNameText: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "700",
    },
    cancelNameText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    accountEmail: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginBottom: 20,
    },
    subscriptionCard: {
      width: "100%",
      backgroundColor: theme.colors.accentTint,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.gold,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    proBadge: {
      color: theme.colors.gold,
      fontSize: 15,
      fontWeight: "800",
    },
    trialStatus: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 10,
    },
    upgradeBtn: {
      backgroundColor: theme.colors.gold,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: theme.radius.md,
    },
    upgradeBtnText: {
      color: theme.colors.textDark,
      fontSize: 14,
      fontWeight: "700",
    },
    accountSpinner: {
      marginBottom: 14,
    },
    signOutBtn: {
      backgroundColor: theme.colors.danger,
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: theme.radius.md,
      marginBottom: 16,
    },
    signOutBtnText: {
      color: theme.colors.textOnAccent,
      fontSize: 14,
      fontWeight: "700",
    },
    deleteAccountBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    deleteAccountBtnText: {
      color: theme.colors.dangerSoft,
      fontSize: 13,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    confirmOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    confirmCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 20,
    },
    confirmTitle: {
      color: theme.colors.textLight,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 10,
    },
    confirmBody: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 18,
    },
    confirmRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
    },
    confirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: theme.radius.sm,
    },
    confirmCancel: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    confirmCancelText: {
      color: theme.colors.textLight,
      fontWeight: "600",
      fontSize: 13,
    },
    confirmDanger: {
      backgroundColor: theme.colors.danger,
    },
    confirmDangerText: {
      color: theme.colors.textOnAccent,
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
