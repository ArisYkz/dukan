import { useState, useEffect } from "react";
import { X, ExternalLink, Ban, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminMutations } from "@/hooks/queries/admin/useAdminMutations";
import { Skeleton } from "@/components/ui/skeleton";

interface StoreDetailSheetProps {
  storeId: string | null;
  onClose: () => void;
}

const StoreDetailSheet = ({ storeId, onClose }: StoreDetailSheetProps) => {
  const [store, setStore] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { ban, unban } = useAdminMutations();

  useEffect(() => {
    if (!storeId) { setStore(null); setOwnerProfile(null); return; }

    const fetchData = async () => {
      setLoading(true);

      // Fetch store data
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();
      setStore(storeData);

      // Fetch owner profile for subscription status
      if (storeData) {
        const { data: member } = await supabase
          .from("store_members")
          .select("user_id")
          .eq("store_id", storeId)
          .eq("role", "owner")
          .maybeSingle();

        if (member) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("plan_type, subscription_status, subscription_active")
            .eq("user_id", member.user_id)
            .single();
          if (profile) setOwnerProfile(profile);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [storeId]);

  if (!storeId) return null;

  const subscriptionStatus = ownerProfile?.subscription_status ?? store?.subscription_status;
  const planType = ownerProfile?.plan_type ?? store?.plan_type;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl overflow-y-auto">
      <div className="sticky top-0 bg-background border-b border-border flex items-center justify-between px-6 py-4">
        <h3 className="font-mono text-xs tracking-[0.15em] uppercase">Store Detail</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : store ? (
        <div className="p-6 space-y-5">
          <div>
            <p className="font-mono text-xs font-semibold">{store.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">/{store.slug}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Status", subscriptionStatus],
              ["Plan", planType],
              ["Paused", store.is_paused ? "Yes" : "No"],
              ["Views", store.total_views],
              ["Orders", store.total_sales_count],
              ["Earned", `${Number(store.total_earned ?? 0).toLocaleString()} ৳`],
            ].map(([label, value]) => (
              <div key={label as string} className="border border-border p-3">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="font-mono text-xs mt-0.5">{String(value ?? "-")}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <a
              href={`/s/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase px-4 py-2.5 border border-border hover:bg-muted transition-colors w-full"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Storefront
            </a>
            {subscriptionStatus === "banned" ? (
              <button
                onClick={() => unban.mutate(store.id)}
                className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase px-4 py-2.5 border border-green-500/30 text-green-500 hover:bg-green-500/5 transition-colors w-full"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Unban Store
              </button>
            ) : (
              <button
                onClick={() => ban.mutate(store.id)}
                className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase px-4 py-2.5 border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-colors w-full"
              >
                <Ban className="w-3.5 h-3.5" /> Ban Store
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StoreDetailSheet;
