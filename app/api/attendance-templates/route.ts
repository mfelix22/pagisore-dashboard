import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_NAME = "officer_session";
const COOKIE_VALUE = "authenticated";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("attendance_templates")
      .select("event_name,content")
      .order("event_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to load attendance templates";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    typeof (body as { event_name: unknown }).event_name !== "string" ||
    typeof (body as { content: unknown }).content !== "string"
  ) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid event_name / content" },
      { status: 400 }
    );
  }

  const { event_name, content } = body as {
    event_name: string;
    content: string;
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("attendance_templates")
      .upsert({ event_name, content }, { onConflict: "event_name" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to save attendance template";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
