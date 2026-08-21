import { ServiceWorkspace } from "@/components/service/service-workspace";
import { getServiceWorkspace } from "@/lib/services/service";

export default async function ServicePage() {
  const data = await getServiceWorkspace();
  return <ServiceWorkspace data={data} />;
}
