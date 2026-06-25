import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const auth = req.cookies.get("guardian_auth")?.value;
  const password = process.env.GUARDIAN_PASSWORD ?? "hangar2024";

  if (auth !== password) {
    const loginUrl = new URL("/guardian/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/guardian/membros", "/guardian/membros/:path*"],
};
