import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Define all routes that require authentication
const protectedRoutes = ["/dashboard", "/api"];
const publicApiRoutes = ["/api/auth/login"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicApi = publicApiRoutes.some(route => path.startsWith(route));

  // Skip protection for public API routes even if they start with /api
  if (isProtectedRoute && !isPublicApi) {
    const sessionCookie = request.cookies.get("session")?.value;
    
    // Redirect or unauthorized if no session cookie
    if (!sessionCookie) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verify token
    const payload = await decrypt(sessionCookie);

    if (!payload || !payload.username) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }

    // If session is valid, ensure no caching for sensitive dashboard pages
    // This prevents the user from seeing private data via "back" button after logging out
    const response = NextResponse.next();
    if (path.startsWith("/dashboard") || path.startsWith("/api")) {
      response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|$).*)"],
};
