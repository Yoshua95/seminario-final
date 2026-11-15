import { OperatorDirectory } from "@/features/marketplace/directory";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  return <OperatorDirectory filters={await searchParams} />;
}
