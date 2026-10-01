import { requireAdminPage } from "@/core/modules/auth/service";

export default async function AdminPreviewDetailPage({
  params,
}: PageProps<"/admin/previews/[id]">) {
  await requireAdminPage();
  const { id } = await params;

  return (
    <main>
      <h1>Preview {id}</h1>
      <p>Detailweergave volgt.</p>
    </main>
  );
}
