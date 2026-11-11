import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { getLegalVersion, LegalPublishError, publishLegalDocument } from "@/core/modules/legal/service";
import { isLegalDocumentSlug, publishLegalDocumentSchema } from "@/core/modules/legal/types";

// A legal page's versions (core/modules/legal): GET ?version=... reads one, POST publishes a new one.

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return NextResponse.json({ error: `Ongeldige invoer (${issue.path.join(".") || "formulier"}): ${issue.message}` }, { status: 400 });
  }
  if (error instanceof LegalPublishError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error("[legal]", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(request: Request, ctx: RouteContext<"/api/admin/legal/[document]">) {
  try {
    await requireAdmin();
    const { document } = await ctx.params;
    const version = new URL(request.url).searchParams.get("version");
    if (!isLegalDocumentSlug(document) || !version) return notFound();
    const found = await getLegalVersion(document, version.slice(0, 40));
    return found ? NextResponse.json({ version: found }) : notFound();
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/legal/[document]">) {
  try {
    const session = await requireAdmin();
    const { document } = await ctx.params;
    if (!isLegalDocumentSlug(document)) return notFound();
    const { content } = publishLegalDocumentSchema(document).parse(await request.json().catch(() => null));
    return NextResponse.json({ version: await publishLegalDocument(document, content, session.user.name) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
