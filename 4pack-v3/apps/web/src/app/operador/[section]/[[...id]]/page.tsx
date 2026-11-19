import { OperatorPanel } from "@/features/operator/panel";
import type { Search } from "@/features/operator/panel";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id?: string[] }>;
  searchParams: Promise<Search>;
}) {
  const { section, id } = await params;
  if (id && id.length > 1) notFound();
  return (
    <OperatorPanel section={section} id={id?.[0]} search={await searchParams} />
  );
}
