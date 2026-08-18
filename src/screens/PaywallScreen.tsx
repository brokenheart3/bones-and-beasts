import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesPackage } from "react-native-purchases";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { usePurchasesStore } from "../store/usePurchasesStore";
import { useAuthStore } from "../store/useAuthStore";
import { getCreationTime, isWithinTrial, trialDaysRemaining } from "../utils/trial";
import { PlayStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<PlayStackParamList, "Paywall">;

const TERMS_URL = "https://bonesandbeasts.sapient7.com/legal/terms.html";
const PRIVACY_URL = "https://bonesandbeasts.sapient7.com/legal/privacy.html";

export default function PaywallScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const PACKAGE_LABELS: Record<string, string> = {
    MONTHLY: t("paywall.monthly"),
    ANNUAL: t("paywall.yearly"),
    LIFETIME: t("paywall.lifetime"),
  };
  const user = useAuthStore((s) => s.user);
  const isPro = usePurchasesStore((s) => s.isPro);
  const offering = usePurchasesStore((s) => s.offering);
  const busy = usePurchasesStore((s) => s.busy);
  const error = usePurchasesStore((s) => s.error);
  const fetchOfferings = usePurchasesStore((s) => s.fetchOfferings);
  const purchasePackage = usePurchasesStore((s) => s.purchasePackage);
  const restorePurchases = usePurchasesStore((s) => s.restorePurchases);
  const clearError = usePurchasesStore((s) => s.clearError);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  useEffect(() => {
    if (isPro) navigation.goBack();
  }, [isPro, navigation]);

  const creationTime = getCreationTime(user);
  const trialActive = isWithinTrial(creationTime);
  const daysLeft = trialDaysRemaining(creationTime);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    clearError();
    try {
      await purchasePackage(pkg);
      navigation.goBack();
    } catch {
      // error already surfaced via the store; user-cancelled is silent
    }
  };

  const handleRestore = async () => {
    clearError();
    try {
      await restorePurchases();
      navigation.goBack();
    } catch {
      // error already surfaced via the store
    }
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t("paywall.title")}</Text>
        <Text style={styles.subtitle}>
          {trialActive
            ? t("paywall.trialActiveSubtitle", { count: daysLeft })
            : t("paywall.trialEndedSubtitle")}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {!offering ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.packages}>
            {offering.availablePackages.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                style={styles.packageCard}
                onPress={() => handlePurchase(pkg)}
                disabled={busy}
              >
                <Text style={styles.packageLabel}>
                  {PACKAGE_LABELS[pkg.packageType] ?? pkg.product.title}
                </Text>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {busy && <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 16 }} />}

        <Text style={styles.disclosure}>{t("paywall.subscriptionDisclosure")}</Text>

        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.legalLink}>{t("paywall.termsOfUse")}</Text>
          </Pressable>
          <Text style={styles.legalSeparator}>•</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.legalLink}>{t("paywall.privacyPolicy")}</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleRestore} style={styles.restoreBtn} disabled={busy}>
          <Text style={styles.restoreBtnText}>{t("paywall.restorePurchases")}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} style={styles.notNowBtn}>
          <Text style={styles.notNowBtnText}>{t("paywall.notNow")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 10,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginBottom: 24,
      maxWidth: 420,
      lineHeight: 20,
    },
    errorText: {
      color: theme.colors.dangerSoft,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 16,
    },
    packages: {
      width: "100%",
      maxWidth: 420,
      gap: 12,
    },
    packageCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.surfaceAlt,
      paddingVertical: 16,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    packageLabel: {
      color: theme.colors.textLight,
      fontSize: 16,
      fontWeight: "700",
    },
    packagePrice: {
      color: theme.colors.goldSoft,
      fontSize: 16,
      fontWeight: "800",
    },
    disclosure: {
      marginTop: 20,
      maxWidth: 420,
      color: theme.colors.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
    },
    legalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
    },
    legalLink: {
      color: theme.colors.goldSoft,
      fontSize: 12,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    legalSeparator: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    restoreBtn: {
      marginTop: 24,
    },
    restoreBtnText: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "600",
    },
    notNowBtn: {
      marginTop: 14,
    },
    notNowBtnText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
  });
}
