import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const EO_EVENT_NAME = "Emperium Overrun";
const EO_EVENT_TYPE = "attendance";
const CRON_TIMEZONE = process.env.EO_CRON_TIMEZONE || "Asia/Jakarta";

function getDateInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

function addDaysInTimeZone(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(
    date
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const today = getDateInTimeZone(CRON_TIMEZONE);
    const eventDate = addDaysInTimeZone(today, 1);

    const { data: existing, error: findError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("name", EO_EVENT_NAME)
      .eq("event_date", eventDate)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          created: false,
          eventId: existing.id,
          eventDate,
          message: "EO event already exists for this date",
        },
        { status: 200 }
      );
    }

    const { data: event, error: insertError } = await supabaseAdmin
      .from("events")
      .insert({
        name: EO_EVENT_NAME,
        event_type: EO_EVENT_TYPE,
        event_date: eventDate,
        event_time: "19:55:00",
      })
      .select("id")
      .single();

    if (insertError || !event) {
      throw insertError || new Error("Failed to create EO event");
    }

    return NextResponse.json(
      {
        success: true,
        created: true,
        eventId: event.id,
        eventDate,
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unknown error";
    console.error("EO attendance cron error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
