import { OperatorDirectory } from "@/features/marketplace/directory";
export default async function Page({params}:{params:Promise<{id:string}>}) {
  return <OperatorDirectory demo id={(await params).id} />;
}
