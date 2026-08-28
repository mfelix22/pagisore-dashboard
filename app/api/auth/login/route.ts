import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "officer_session";
const COOKIE_VALUE = "authenticated";

export async function POST(req: NextRequest) {
  const expected = process.env.DASHBOARD_OFFICER_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { success: false, error: "Officer password not configured" },
      { status: 500 }
    );
  }

  let password: string | undefined;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json(
      { success: false, error: "Invalid password" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
