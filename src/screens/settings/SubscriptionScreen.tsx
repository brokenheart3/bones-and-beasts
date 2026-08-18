import React, { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../../theme";
import { useAuthStore } from "../../store/useAuthStore";
import { usePurchasesStore } from "../../store/usePurchasesStore";
import { SubscriptionInfo } from "../../types/subscription";
import { getCreationTime, isWithinTrial, trialDaysRemaining } from "../../utils/trial";
import { SettingsStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<SettingsStackParamList, "Subscription">;

const TERMS_URL = "https://bonesandbeasts.sapient7.com/legal/terms.html";
const PRIVACY_URL = "https://bonesandbeasts.sapient7.com/legal/privacy.html";

type PlanKey = "monthly" | "yearly" | "lifetime";

// The store hook resolves to a different concrete offering/package shape per
// platform (RevenueCat's PurchasesOffering vs. the web store's plain Stripe-
// backed WebOffering) — this only reads the handful of fields both shapes
// share (packageType, product.priceString, and, on native only, a product
// identifier) so it works against whichever one is actually running.
function resolvePlan(
  info: SubscriptionInfo | null,
  offering: { availablePackages: { packageType: string; product: { identifier?: string; priceString: string } }[] } | null
): { planKey: PlanKey | null; priceString: string | null } {
  if (!info) return { planKey: null, priceString: null };
  const packageTypeToPlan: Record<string, PlanKey> = {
    MONTHLY: "monthly",
    ANNUAL: "yearly",
    LIFETIME: "lifetime",
  };

  const pkg = offering?.availablePackages.find((p) =>
    info.productIdentifier
      ? p.product.identifier === info.productIdentifier
      : packageTypeToPlan[p.packageType] === info.plan
  );

  return {
    planKey: info.plan ?? (pkg ? packageTypeToPlan[pkg.packageType] ?? null : null),
    priceString: pkg?.product.priceString ?? null,
  };
}

function formatDate(ms: number | null): string | null {
  if (ms == null) return null;
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function SubscriptionScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const isPro = usePurchasesStore((s) => s.isPro);
  const subscriptionInfo = usePurchasesStore((s) => s.subscriptionInfo);
  const offering = usePurchasesStore((s) => s.offering);
  const busy = usePurchasesStore((s) => s.busy);
  const error = usePurchasesStore((s) => s.error);
  const fetchOfferings = usePurchasesStore((s) => s.fetchOfferings);
  const restorePurchases = usePurchasesStore((s) => s.restorePurchases);
  const manageSubscription = usePurchasesStore((s) => s.manageSubscription);
  const clearError = usePurchasesStore((s) => s.clearError);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  const creationTime = getCreationTime(user);
  const trialActive = isWithinTrial(creationTime);
  const daysLeft = trialDaysRemaining(creationTime);

  const { planKey, priceString } = resolvePlan(subscriptionInfo, offering);
  const isLifetime = planKey === "lifetime";

  const planLabel =
    planKey === "monthly"
      ? t("subscription.planMonthly")
      : planKey === "yearly"
        ? t("subscription.planYearly")
        : planKey === "lifetime"
          ? t("subscription.planLifetime")
          : null;

  const billedViaLabel =
    subscriptionInfo?.store === "APP_STORE"
      ? t("subscription.billedViaAppStore")
      : subscriptionInfo?.store === "PLAY_STORE"
        ? t("subscription.billedViaPlayStore")
        : subscriptionInfo?.store
          ? t("subscription.billedViaWeb")
          : null;

  const statusLabel = isLifetime
    ? t("subscription.statusLifetime")
    : isPro
      ? t("subscription.statusPro")
      : trialActive
        ? t("subscription.statusTrial")
        : t("subscription.statusFree");

  const handleUpgrade = () => {
    navigation.getParent()?.navigate("Play", { screen: "Paywall" });
  };

  const handleManage = async () => {
    clearError();
    try {
      await manageSubscription();
    } catch {
      // error already surfaced via the store
    }
  };

  const handleRestore = async () => {
    clearError();
    try {
      await restorePurchases();
    } catch {
      // error already surfaced via the store
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        {!isPro && trialActive && (
          <Text style={styles.trialNote}>{t("home.trialActive", { count: daysLeft })}</Text>
        )}
      </View>

      {isPro && (
        <View style={styles.section}>
          {planLabel && <DetailRow styles={styles} label={t("subscription.planLabel")} value={planLabel} />}
          {priceString && <DetailRow styles={styles} label={t("subscription.priceLabel")} value={priceString} />}
          {subscriptionInfo?.startDate != null && (
            <DetailRow
              styles={styles}
              label={t("subscription.startedLabel")}
              value={formatDate(subscriptionInfo.startDate) ?? ""}
            />
          )}
          {!isLifetime && subscriptionInfo?.currentPeriodEnd != null && (
            <DetailRow
              styles={styles}
              label={subscriptionInfo.willRenew ? t("subscription.renewsLabel") : t("subscription.expiresLabel")}
              value={formatDate(subscriptionInfo.currentPeriodEnd) ?? ""}
            />
          )}
          {!isLifetime && subscriptionInfo?.willRenew != null && (
            <DetailRow
              styles={styles}
              label={t("subscription.autoRenewLabel")}
              value={subscriptionInfo.willRenew ? t("subscription.autoRenewOn") : t("subscription.autoRenewOff")}
            />
          )}
          {billedViaLabel && (
            <DetailRow styles={styles} label={t("subscription.billedViaLabel")} value={billedViaLabel} />
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>{t("subscription.whatsIncludedHeading")}</Text>
        <Text style={styles.includedItem}>• {t("subscription.includedGroup")}</Text>
        <Text style={styles.includedItem}>• {t("subscription.includedSolo")}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {busy && <ActivityIndicator color={theme.colors.gold} style={styles.spinner} />}

      {isLifetime ? (
        <Text style={styles.note}>{t("subscription.lifetimeNote")}</Text>
      ) : isPro ? (
        <>
          <Pressable style={styles.primaryBtn} onPress={handleManage} disabled={busy}>
            <Text style={styles.primaryBtnText}>{t("subscription.manageSubscription")}</Text>
          </Pressable>
          {billedViaLabel && (
            <Text style={styles.note}>{t("subscription.manageNote", { platform: billedViaLabel })}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.note}>{t("subscription.freeNote")}</Text>
          <Pressable style={styles.primaryBtn} onPress={handleUpgrade}>
            <Text style={styles.primaryBtnText}>{t("subscription.upgradeToPro")}</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={handleRestore} style={styles.restoreBtn} disabled={busy}>
        <Text style={styles.restoreBtnText}>{t("paywall.restorePurchases")}</Text>
      </Pressable>

      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.legalLink}>{t("paywall.termsOfUse")}</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>•</Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.legalLink}>{t("paywall.privacyPolicy")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DetailRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof getStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      alignItems: "center",
    },
    statusCard: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.accentTint,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.gold,
      paddingVertical: 20,
      alignItems: "center",
      marginBottom: 16,
    },
    statusLabel: {
      color: theme.colors.gold,
      fontSize: 22,
      fontWeight: "800",
    },
    trialNote: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 6,
    },
    section: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      marginBottom: 16,
    },
    sectionHeading: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceAlt,
    },
    detailLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    detailValue: {
      color: theme.colors.textLight,
      fontSize: 13,
      fontWeight: "700",
    },
    includedItem: {
      color: theme.colors.textLight,
      fontSize: 14,
      lineHeight: 21,
    },
    errorText: {
      color: theme.colors.dangerSoft,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 12,
    },
    spinner: {
      marginBottom: 12,
    },
    note: {
      width: "100%",
      maxWidth: 480,
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: "center",
      marginBottom: 14,
    },
    primaryBtn: {
      width: "100%",
      maxWidth: 480,
      alignItems: "center",
      backgroundColor: theme.colors.gold,
      paddingVertical: 14,
      borderRadius: theme.radius.md,
      marginBottom: 10,
    },
    primaryBtnText: {
      color: theme.colors.textDark,
      fontSize: 16,
      fontWeight: "700",
    },
    restoreBtn: {
      marginTop: 8,
      marginBottom: 16,
    },
    restoreBtnText: {
      color: theme.colors.goldSoft,
      fontSize: 13,
      fontWeight: "600",
    },
    legalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
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
  });
}
