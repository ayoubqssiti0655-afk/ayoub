import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { declareExpense } from "@/server/cash";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.courierProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const type = String(body.type || "other");
    const note = body.note ? String(body.note) : undefined;
    const proofPhoto = body.proofPhoto ? String(body.proofPhoto) : undefined;

    const record = await declareExpense(user.courierProfile.id, {
      amount,
      type,
      note,
      proofPhoto,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error("[Courier expense error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

