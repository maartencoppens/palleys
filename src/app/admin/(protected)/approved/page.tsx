import { requireAdminPage } from "@/core/modules/auth/service";
import { listApprovedModels } from "@/core/modules/previews/service";
import { ApprovedModelsTable } from "@/components/functional/admin/ApprovedModelsTable";

export default async function AdminApprovedPage() {
  await requireAdminPage();
  const models = await listApprovedModels();

  return (
    <main>
      <h1 className="text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
        Goedgekeurd
      </h1>
      <ApprovedModelsTable models={models} />
    </main>
  );
}
