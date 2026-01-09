import { neonAuthMiddleware } from "@neondatabase/auth/next";

export default neonAuthMiddleware({
  loginUrl: "/sign-in",
});

export const config = {
  matcher: [
    // Protect everything except Next internals + our auth endpoints + sign-in page
    "/((?!_next/static|_next/image|favicon.ico|sign-in|api/auth).*)",
  ],
};

