import { useAdminStatsQuery } from "@/hooks/queries/admin/useAdminStatsQuery";
import { Skeleton } from "@/components/ui/skeleton";

const OverviewTab = () => {
  const { data: stats, isLoading } = useAdminStatsQuery();

  const cards = [
    { label: "Stores", value: stats?.totalStores },
    { label: "Products", value: stats?.totalProducts },
    { label: "Orders", value: stats?.totalOrders },
    { label: "Users", value: stats?.totalUsers },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-border p-6">
          <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
            {c.label}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="font-mono text-2xl">{c.value ?? 0}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default OverviewTab;
