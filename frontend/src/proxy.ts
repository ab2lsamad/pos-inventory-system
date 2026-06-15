import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessPath, getDefaultRouteForRole, UNSUPPORTED_ROLE_ROUTE } from '@/lib/route-access';
import type { Role } from '@/types/shared';

const publicPaths = ['/login'];

function readUserRole(request: NextRequest): Role | undefined {
  const raw = request.cookies.get('user')?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { role?: Role };
    return parsed.role;
  } catch {
    return undefined;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = readUserRole(request);

  if (!role) {
    return NextResponse.next();
  }

  if (!canAccessPath(role, pathname)) {
    const fallback = getDefaultRouteForRole(role);
    const target = fallback === pathname ? UNSUPPORTED_ROLE_ROUTE : fallback;
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
