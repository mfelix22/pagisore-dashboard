import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_NAME = "officer_session";
const COOKIE_VALUE = "authenticated";

export async function POST(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value;
  if (session !== COOKIE_VALUE) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof (body as { memberId: unknown }).memberId !== "number" ||
    typeof (body as { eventId: unknown }).eventId !== "number" ||
    typeof (body as { status: unknown }).status !== "string"
  ) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  const { memberId, eventId, status, reason } = body as {
    memberId: number;
    eventId: number;
    status: string;
    reason?: string | null;
  };

  const trimmedReason =
    typeof reason === "string" ? (reason.trim() || null) : null;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (status === "no_response") {
      const { error } = await supabaseAdmin
        .from("event_attendance")
        .delete()
        .eq("member_id", memberId)
        .eq("event_id", eventId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("event_attendance")
        .upsert(
          {
            member_id: memberId,
            event_id: eventId,
            status,
            reason: status === "tidak_hadir" ? trimmedReason : null,
          },
          { onConflict: "member_id,event_id" }
        );
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to update attendance";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
