import { requireAdminPage } from "@/core/modules/auth/service";
import { listApprovedModels } from "@/core/modules/previews/service";
import { ApprovedModelsTable } from "@/components/functional/admin/ApprovedModelsTable";

export const instant = false;

export default async function AdminApprovedPage() {
  await requireAdminPage();
  const models = await listApprovedModels();

  return (
    <main>
      <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
        Goedgekeurd
      </h1>
      <ApprovedModelsTable models={models} />
    </main>
  );
}
