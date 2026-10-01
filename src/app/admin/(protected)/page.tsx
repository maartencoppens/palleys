import { requireAdminPage } from "@/core/modules/auth/service";

export default async function AdminHomePage() {
  await requireAdminPage();
  return (
    <main>
      <h1>Te reviewen previews</h1>
      <p>Hier komt een lijst van previews die nog beoordeeld moeten worden.</p>
    </main>
  ); // later: lijst uit previews/service.ts
}
