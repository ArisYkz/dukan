import { useLabels } from "@/hooks/useLabels";
import { useCallback } from "react";

/**
 * User-facing error codes with readable descriptions.
 */
export const ERROR_CODES = {
  IMG_001: "ERR-IMG-001",
  IMG_002: "ERR-IMG-002",
  ORD_001: "ERR-ORD-001",
  ORD_002: "ERR-ORD-002",
  ORD_003: "ERR-ORD-003",
  ORD_004: "ERR-ORD-004",
  ORD_005: "ERR-ORD-005",
  STR_001: "ERR-STR-001",
  STR_002: "ERR-STR-002",
  STR_003: "ERR-STR-003",
  STR_004: "ERR-STR-004",
  PRD_001: "ERR-PRD-001",
  PRD_002: "ERR-PRD-002",
  PRD_003: "ERR-PRD-003",
  AUTH_001: "ERR-AUTH-001",
  AUTH_002: "ERR-AUTH-002",
  GEN_001: "ERR-GEN-001",
  GEN_002: "ERR-GEN-002",
} as const;

/**
 * Translation-aware error formatting hook.
 * Returns a formatError function that uses the current language.
 */
export const useFormatError = () => {
  const { ERRORS } = useLabels();

  return useCallback(
    (code: string, _detail?: string): string => {
      const message = ERRORS?.[code] || "Something went wrong.";
      return `${code}: ${message}`;
    },
    [ERRORS],
  );
};

/**
 * Fallback formatError for non-component contexts (English only).
 * Prefer useFormatError() inside components.
 */
export const formatError = (code: string, _detail?: string): string => {
  const fallback: Record<string, string> = {
    [ERROR_CODES.IMG_001]: "The file is too large. Maximum size is 5MB.",
    [ERROR_CODES.IMG_002]: "Failed to upload the image. Please try again.",
    [ERROR_CODES.ORD_001]: "Please check all required fields and try again.",
    [ERROR_CODES.ORD_002]: "You recently placed an order. Please wait 2 minutes.",
    [ERROR_CODES.ORD_003]: "Store not found. The link may be invalid.",
    [ERROR_CODES.ORD_004]: "Could not create the order. Please try again later.",
    [ERROR_CODES.ORD_005]: "Could not confirm payment. Please try again.",
    [ERROR_CODES.STR_001]: "This store link is already taken.",
    [ERROR_CODES.STR_002]: "Could not create the store. Please try again.",
    [ERROR_CODES.STR_003]: "Could not save store settings. Please try again.",
    [ERROR_CODES.STR_004]: "WhatsApp number is required.",
    [ERROR_CODES.PRD_001]: "Could not save the product. Please try again.",
    [ERROR_CODES.PRD_002]: "Product limit reached. Upgrade to add more.",
    [ERROR_CODES.PRD_003]: "Could not delete the product. Please try again.",
    [ERROR_CODES.AUTH_001]: "Login failed. Please check your credentials.",
    [ERROR_CODES.AUTH_002]: "Registration failed. Please try again.",
    [ERROR_CODES.GEN_001]: "Something went wrong. Please try again.",
    [ERROR_CODES.GEN_002]: "Network error. Please check your connection.",
  };
  const message = fallback[code] || "Something went wrong.";
  return `${code}: ${message}`;
};
