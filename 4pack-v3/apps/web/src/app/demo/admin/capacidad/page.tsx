import { CapacityAdminPage } from "@/features/capacity/admin-page";
export const dynamic = "force-dynamic";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; operator?: string }>;
}) {
  return <CapacityAdminPage demo searchParams={searchParams} />;
}
