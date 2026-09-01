import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const SECTIONS = [
  "ACTIONS", "AUTH", "STATUS_LABELS", "STATUS_DISPLAY", "ORDER_STEPS",
  "ORDER_FILTER_LABELS", "DASHBOARD_TABS", "MESSAGES", "PRODUCT", "CHECKOUT",
  "SUCCESS", "TRACKING", "STOREFRONT", "BRANDING", "PRODUCTS_TAB", "VARIANTS",
  "ORDERS_TAB", "ARCHIVE_TAB", "ANALYTICS", "BILLING", "UPGRADE", "BANNED",
  "STORE_CREATION", "SETTINGS", "STORE_STATS", "CONFIRM", "LANDING",
  "MANUAL_ORDER", "REPORT", "QR_CARD", "PROMO_TAB", "ERRORS", "BULK_UPLOAD", "VERIFICATION", "RETURNS",
  "COOKIE_CONSENT", "DASHBOARD_BANNERS", "IMAGE_UPLOAD", "MISC",
] as const;

const DERIVED_KEYS = ["DAY_NAMES", "MONTH_NAMES", "CSV_HEADERS", "COLOR_PRESETS"] as const;

/**
 * Returns all label sections translated to the current language.
 * Backward-compatible wrapper around react-i18next.
 */
export const useLabels = () => {
  const { t, i18n: i18nInstance } = useTranslation();

  return useMemo(() => {
    const get = (section: string): Record<string, any> => {
      // i18next flattens nested keys with dots, so we get the whole section object
      const obj = t(section, { returnObjects: true });
      if (obj && typeof obj === "object") return obj as Record<string, any>;
      return {};
    };

    const misc = get("MISC");

    const labels: Record<string, any> = {};
    for (const section of SECTIONS) {
      labels[section] = get(section);
    }

    // Derived arrays from MISC section
    labels.DAY_NAMES = (misc.DAY_NAMES as string || "").split(",");
    labels.MONTH_NAMES = (misc.MONTH_NAMES as string || "").split(",");
    labels.CSV_HEADERS = (misc.CSV_HEADERS as string || "").split(",");
    labels.COLOR_PRESETS = (misc.COLOR_PRESETS as string || "").split(",");

    return labels as Record<string, any>;
  }, [t, i18nInstance.language]);
};
