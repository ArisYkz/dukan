import { supabase } from "@/integrations/supabase/client";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-seller`;

// Kazakhstan IIN/BIN checksum algorithm
export const validateIinBinChecksum = (iinBin: string): boolean => {
  if (iinBin.length !== 12 || !/^\d{12}$/.test(iinBin)) return false;
  const digits = iinBin.split("").map(Number);
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

  const sum1 = digits.slice(0, 11).reduce((s, d, i) => s + d * w1[i], 0);
  let checksum = sum1 % 11;

  if (checksum === 10) {
    const sum2 = digits.slice(0, 11).reduce((s, d, i) => s + d * w2[i], 0);
    checksum = sum2 % 11;
  }

  if (checksum === 10) checksum = 0;

  return checksum === digits[11];
};

export interface VerifySellerInput {
  storeId: string;
  sellerType: "individual_entrepreneur" | "legal_entity";
  iinBin: string;
  legalName: string;
}

export interface VerifySellerResult {
  status: "unverified" | "verified" | "mismatch" | "suspended" | "manual_review";
  officialName?: string;
  alreadyVerified?: boolean;
}

export const verifySeller = async (
  input: VerifySellerInput,
): Promise<VerifySellerResult> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const response = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409) throw new Error("DUPLICATE_IIN");
    throw new Error(result.error?.fieldErrors ? "Invalid input" : result.error);
  }
  return result;
};

