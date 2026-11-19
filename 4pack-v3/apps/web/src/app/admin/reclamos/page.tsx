import { AdminWorkspace } from "@/features/admin/workspace";
export const dynamic = "force-dynamic";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <AdminWorkspace
      section="reclamos"
      demo={false}
      searchParams={searchParams}
    />
  );
}
