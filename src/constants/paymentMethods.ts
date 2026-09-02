export type PaymentMethodsConfig = {
  wallets: Record<string, { enabled: boolean; phone: string; qr_url: string | null }>;
};
