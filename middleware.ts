import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except Next internals + our auth endpoints + sign-in page
    "/((?!_next/static|_next/image|favicon.ico|sign-in|api/auth).*)",
  ],
};

