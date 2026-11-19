import { ImporterScreen } from "@/features/multirole/pages";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  return <ImporterScreen parts={(await params).path ?? []} />;
}
