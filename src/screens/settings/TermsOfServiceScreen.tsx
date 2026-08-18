import React from "react";
import { useTranslation } from "react-i18next";
import StaticInfoScreen from "../../components/StaticInfoScreen";

// Plain-language terms reflecting how the app actually works today — not
// reviewed by a lawyer, so treat this as an honest draft rather than final
// legal copy.
export default function TermsOfServiceScreen() {
  const { t } = useTranslation();
  return (
    <StaticInfoScreen
      updated="July 29, 2026"
      sections={[
        { body: t("termsOfService.intro") },
        { heading: t("termsOfService.gameHeading"), body: t("termsOfService.gameBody") },
        { heading: t("termsOfService.fairPlayHeading"), body: t("termsOfService.fairPlayBody") },
        { heading: t("termsOfService.subscriptionsHeading"), body: t("termsOfService.subscriptionsBody") },
        { heading: t("termsOfService.noWarrantyHeading"), body: t("termsOfService.noWarrantyBody") },
        { heading: t("termsOfService.liabilityHeading"), body: t("termsOfService.liabilityBody") },
        { heading: t("termsOfService.changesHeading"), body: t("termsOfService.changesBody") },
      ]}
    />
  );
}
