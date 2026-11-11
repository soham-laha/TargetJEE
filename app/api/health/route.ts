import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "targetjee-web", timestamp: new Date().toISOString() });
}
