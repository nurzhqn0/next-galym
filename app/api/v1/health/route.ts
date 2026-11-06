import { NextResponse } from "next/server";
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Liveness plus a database round trip. Reports nothing about why it failed. */
export async function GET() {
  await connection();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
