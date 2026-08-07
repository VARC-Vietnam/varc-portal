import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { pingValkey } from "@/lib/cache/valkey";

export async function GET() {
  try {
    await connectDb();
    // Valkey is best-effort cache; never fail readiness when it is down.
    const valkey = await pingValkey();
    return NextResponse.json({ status: "ok", valkey });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
