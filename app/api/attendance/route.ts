import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "officer_session";
const COOKIE_VALUE = "authenticated";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value;
  if (session !== COOKIE_VALUE) {
    return unauthorized();
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const allData: any[] = [];
    const pageSize = 1000;
    let start = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("event_attendance")
        .select("member_id, event_id, status, reason")
        .order("id", { ascending: true })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      start += pageSize;
    }
    const hadirCount = allData.filter((r) => r.status === "hadir").length;
    console.log("[attendance GET] rows:", allData.length, "hadir:", hadirCount);
    return NextResponse.json(
      { success: true, data: allData },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to load attendance";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value;
  if (session !== COOKIE_VALUE) {
    return unauthorized();
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
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from("members")
        .select("ign, discord_id")
        .eq("id", memberId)
        .single();

      if (memberError || !memberData) {
        throw memberError ?? new Error("Member not found");
      }

      const { error } = await supabaseAdmin
        .from("event_attendance")
        .upsert(
          {
            member_id: memberId,
            event_id: eventId,
            discord_user_id: memberData.discord_id,
            discord_username: memberData.ign,
            status,
            reason: status === "izin" ? trimmedReason : null,
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
