import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Same-origin broker for the Python vision service. Server-owned provider secrets stay
 * private; explicit learner BYOK headers are allow-listed and forwarded only per request.
 */
export async function POST(request: Request) {
  const apiBase = process.env.TARGETJEE_API_BASE_URL ?? "http://127.0.0.1:8000";
  try {
    const formData = await request.formData();
    const byokHeaders = new Headers();
    for (const header of ["X-TargetJee-Vision-Provider", "X-TargetJee-Api-Key", "X-TargetJee-Vision-Model"]) {
      const value = request.headers.get(header);
      if (value) byokHeaders.set(header, value);
    }
    const upstream = await fetch(`${apiBase}/v1/extractions`, {
      method: "POST",
      body: formData,
      headers: byokHeaders,
      cache: "no-store"
    });
    const payload = await upstream.text();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" }
    });
  } catch {
    return NextResponse.json(
      { detail: "Vision extraction service is unavailable. Configure TARGETJEE_API_BASE_URL and start FastAPI." },
      { status: 503 }
    );
  }
}
