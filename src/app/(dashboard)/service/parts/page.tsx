import { ServicePartsWorkspace } from "@/components/service/service-parts-workspace";
import { getServicePartDirectory } from "@/lib/services/service-parts";

export default async function ServicePartsPage() {
  const data = await getServicePartDirectory();
  return <ServicePartsWorkspace data={data} />;
}
