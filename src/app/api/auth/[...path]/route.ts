import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authApiHandler } from "@neondatabase/auth/next";

const handlers = authApiHandler();

function isSignUpPath(req: NextRequest) {
  // We run a closed system: no self-serve signups. Block common signup routes.
  const path = req.nextUrl.pathname.toLowerCase();
  return (
    path.includes("/sign-up") ||
    path.includes("/signup") ||
    path.includes("/register")
  );
}

export async function GET(req: NextRequest, ctx: unknown) {
  return handlers.GET(req, ctx as any);
}

export async function POST(req: NextRequest, ctx: unknown) {
  if (isSignUpPath(req)) {
    return NextResponse.json({ error: "Sign up disabled" }, { status: 404 });
  }
  return handlers.POST(req, ctx as any);
}

