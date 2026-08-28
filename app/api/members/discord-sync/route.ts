import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Mapping = {
  ign: string;
  discord_id: string;
};

type DbMember = {
  id: number;
  ign: string;
};

export async function POST(req: NextRequest) {
  const expected = process.env.PAGISORE_BOT_API_SECRET;
  const auth = req.headers.get("Authorization");

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let mappings: Mapping[] = [];
  try {
    const body = await req.json();
    mappings = Array.isArray(body?.mappings) ? body.mappings : [];
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, ign");

  if (membersError) {
    return NextResponse.json(
      { success: false, error: `Failed to load members: ${membersError.message}` },
      { status: 500 }
    );
  }

  const membersByIgn = new Map<string, number>();
  ((members as DbMember[]) ?? []).forEach((m) => {
    membersByIgn.set(m.ign.trim().toLowerCase(), m.id);
  });

  const stats = {
    processed: 0,
    updated: 0,
    notFound: 0,
    failed: 0,
    skipped: 0,
  };

  for (const mapping of mappings) {
    const ign = mapping.ign?.trim();
    const discordId = mapping.discord_id?.trim();

    if (!ign || !discordId) {
      stats.skipped++;
      continue;
    }

    const memberId = membersByIgn.get(ign.toLowerCase());
    if (!memberId) {
      stats.notFound++;
      continue;
    }

    const { error } = await supabase
      .from("members")
      .update({ discord_id: discordId })
      .eq("id", memberId);

    if (error) {
      console.error(`Failed to update discord_id for ${ign}:`, error);
      stats.failed++;
    } else {
      stats.updated++;
    }
    stats.processed++;
  }

  return NextResponse.json({ success: true, stats });
}
