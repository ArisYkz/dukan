import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar, { type AdminTab } from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import OverviewTab from "@/components/admin/OverviewTab";
import StoresTab from "@/components/admin/StoresTab";
import AuditLogTab from "@/components/admin/AuditLogTab";
import SubscriptionsTab from "@/components/admin/SubscriptionsTab";
import UsersTab from "@/components/admin/UsersTab";
import StoreDetailSheet from "@/components/admin/StoreDetailSheet";

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [detailStoreId, setDetailStoreId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.role !== "admin") { navigate("/dashboard"); return; }

      setIsAdmin(true);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar tab={tab} setTab={setTab} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <div className="md:hidden px-4 pt-2">
            <SidebarTrigger />
          </div>
          <main className="flex-1 p-4 md:p-6">
            <div className="container">
              {tab === "overview" && <OverviewTab />}
              {tab === "stores" && <StoresTab onSelectStore={setDetailStoreId} />}
              {tab === "audit" && <AuditLogTab />}
              {tab === "subscriptions" && <SubscriptionsTab />}
              {tab === "users" && <UsersTab />}
            </div>
          </main>
        </div>
      </div>
      <StoreDetailSheet storeId={detailStoreId} onClose={() => setDetailStoreId(null)} />
    </SidebarProvider>
  );
}
