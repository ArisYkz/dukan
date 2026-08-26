import { Shield } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader,
} from "@/components/ui/sidebar";

export type AdminTab = "overview" | "stores" | "audit" | "subscriptions" | "users";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "stores", label: "Stores" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "users", label: "Users" },
  { key: "audit", label: "Audit" },
];

interface AdminSidebarProps {
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
}

const AdminSidebar = ({ tab, setTab }: AdminSidebarProps) => {
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
      <SidebarHeader className="px-0 pt-0">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <Shield className="w-5 h-5 text-primary shrink-0" />
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground/50 group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {TABS.map(({ key, label }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={tab === key}
                    onClick={() => setTab(key)}
                    className="font-mono text-[10px] tracking-[0.15em] uppercase"
                  >
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
