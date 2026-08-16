import React from "react";
import { useTranslation } from "react-i18next";
import StaticInfoScreen from "../../components/StaticInfoScreen";

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <StaticInfoScreen
      sections={[
        { body: t("about.intro") },
        { heading: t("about.howToPlayHeading"), body: t("about.howToPlayBody") },
        { heading: t("about.builtWithHeading"), body: t("about.builtWithBody") },
        { heading: t("about.versionHeading"), body: "1.0.0" },
        { heading: t("about.noteHeading"), body: t("about.noteBody") },
      ]}
    />
  );
}
