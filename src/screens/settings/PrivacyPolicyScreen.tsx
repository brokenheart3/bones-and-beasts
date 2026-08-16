import React from "react";
import { useTranslation } from "react-i18next";
import StaticInfoScreen from "../../components/StaticInfoScreen";

// Reflects the app's actual current data handling (see README's "Solo
// rules vs. online Group rules" and net/ layer) — not reviewed by a lawyer,
// so treat this as an accurate plain-language draft rather than final
// legal copy.
export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  return (
    <StaticInfoScreen
      updated="August 2, 2026"
      sections={[
        { body: t("privacyPolicy.intro") },
        { heading: t("privacyPolicy.accountHeading"), body: t("privacyPolicy.accountBody") },
        { heading: t("privacyPolicy.soloHeading"), body: t("privacyPolicy.soloBody") },
        { heading: t("privacyPolicy.groupHeading"), body: t("privacyPolicy.groupBody") },
        { heading: t("privacyPolicy.childrenHeading"), body: t("privacyPolicy.childrenBody") },
        { heading: t("privacyPolicy.changesHeading"), body: t("privacyPolicy.changesBody") },
        { heading: t("privacyPolicy.questionsHeading"), body: t("privacyPolicy.questionsBody") },
      ]}
    />
  );
}
