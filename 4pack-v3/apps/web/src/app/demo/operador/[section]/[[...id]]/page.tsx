import { OperatorPanel } from "@/features/operator/panel";
import type { Search } from "@/features/operator/panel";
import { assertDemo } from "@/features/operator/data";
import { notFound } from "next/navigation";
import { isDemoEnabled } from "@/features/operator/demo-environment.mjs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id?: string[] }>;
  searchParams: Promise<Search>;
}) {
  if (!isDemoEnabled()) notFound();
  assertDemo();
  const { section, id } = await params;
  if (id && id.length > 1) notFound();
  return (
    <OperatorPanel
      demo
      section={section}
      id={id?.[0]}
      search={await searchParams}
    />
  );
}
