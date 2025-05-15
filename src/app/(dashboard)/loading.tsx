// src/app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 w-full p-6">
      <Skeleton className="h-[40px] w-[250px]" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-4">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <Skeleton className="h-[350px] md:col-span-2" />
        <Skeleton className="h-[350px]" />
      </div>
      
      <Skeleton className="h-[400px] w-full mt-4" />
    </div>
  );
}