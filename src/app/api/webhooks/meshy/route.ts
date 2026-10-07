import { NextResponse } from "next/server";
import { z } from "zod";
import { handleMeshyWebhook } from "@/core/modules/previews/service";
import { MeshyWebhookAuthError } from "@/core/networking/external/meshy-client";

const querySchema = z.object({ token: z.string().min(1) });
// We nemen bewust alleen id en status uit de payload: al de rest halen we
// zelf bij Meshy op. Zod laat onbekende velden standaard weg.
const bodySchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
});

export const maxDuration = 120;

export async function POST(request: Request) {
  const query = querySchema.safeParse({
    token: new URL(request.url).searchParams.get("token"),
  });
  if (!query.success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await handleMeshyWebhook({
      token: query.data.token,
      taskId: body.data.id,
      status: body.data.status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MeshyWebhookAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(
      "Meshy webhook failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
