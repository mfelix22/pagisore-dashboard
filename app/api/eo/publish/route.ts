import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId = body?.eventId;

    if (!eventId || typeof eventId !== "number") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid eventId" },
        { status: 400 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, event_date")
      .eq("id", eventId)
      .eq("name", "Emperium Overrun")
      .limit(1)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "EO event not found" },
        { status: 404 }
      );
    }

    const botUrl = process.env.PAGISORE_BOT_API_URL;
    const botSecret = process.env.PAGISORE_BOT_API_SECRET;

    if (!botUrl || !botSecret) {
      return NextResponse.json(
        { success: false, error: "Bot API not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${botUrl}/api/eo/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botSecret}`,
      },
      body: JSON.stringify({ eventId }),
    });

    const result = await res.json().catch(() => ({
      success: false,
      error: "Invalid response from bot",
    }));

    if (!res.ok || !result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Bot publish failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "EO parties published successfully",
    });
  } catch (error) {
    console.error("Dashboard publish error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
