import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 25) + "..." : "MISSING",
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const cityCount = await db.city.count();
    return NextResponse.json({
      status: "SUCCESS",
      envCheck,
      cityCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "DB_ERROR",
        envCheck,
        errorMessage: err.message,
        errorCode: err.code,
        errorName: err.name,
      },
      { status: 500 }
    );
  }
}
