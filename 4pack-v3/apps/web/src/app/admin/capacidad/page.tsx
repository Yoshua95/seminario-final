import { CapacityAdminPage } from "@/features/capacity/admin-page";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; operator?: string }>;
}) {
  return <CapacityAdminPage searchParams={searchParams} />;
}
