import { Role } from '@/types/shared';

type AppRoute = {
  href: string;
  label: string;
  allowedRoles: Role[];
  writeRoles?: Role[];
};

export const APP_ROUTES: AppRoute[] = [
  { href: '/dashboard', label: 'Dashboard', allowedRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/pos', label: 'POS Terminal', allowedRoles: [Role.ADMIN, Role.CASHIER, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
  { href: '/orders', label: 'Orders', allowedRoles: [Role.ADMIN, Role.CASHIER, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
  { href: '/products', label: 'Products', allowedRoles: [Role.ADMIN, Role.CASHIER, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/categories', label: 'Categories', allowedRoles: [Role.ADMIN, Role.CASHIER, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/brands', label: 'Brands', allowedRoles: [Role.ADMIN, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/customers', label: 'Customers', allowedRoles: [Role.ADMIN, Role.MANAGER, Role.CASHIER], writeRoles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
  { href: '/inventory', label: 'Inventory', allowedRoles: [Role.ADMIN, Role.MANAGER, Role.CASHIER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/suppliers', label: 'Suppliers', allowedRoles: [Role.ADMIN, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/purchase-orders', label: 'Purchase Orders', allowedRoles: [Role.ADMIN, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/transfers', label: 'Stock Transfers', allowedRoles: [Role.ADMIN, Role.MANAGER], writeRoles: [Role.ADMIN, Role.MANAGER] },
  { href: '/stores', label: 'Stores', allowedRoles: [Role.ADMIN], writeRoles: [Role.ADMIN] },
  { href: '/users', label: 'Users', allowedRoles: [Role.ADMIN], writeRoles: [Role.ADMIN] },
  { href: '/compensation', label: 'Compensation', allowedRoles: [Role.ADMIN], writeRoles: [Role.ADMIN] },
  { href: '/reports', label: 'Reports', allowedRoles: [Role.ADMIN] },
  { href: '/settings', label: 'Settings', allowedRoles: [Role.ADMIN], writeRoles: [Role.ADMIN] },
];

export const DEFAULT_AUTHED_ROUTE = '/dashboard';
export const UNSUPPORTED_ROLE_ROUTE = '/unsupported-role';

// Explicit landing page per role. Cashiers have no dashboard access and must
// land on the POS terminal after login.
const ROLE_HOME_ROUTE: Partial<Record<Role, string>> = {
  [Role.CASHIER]: '/pos',
};

export function canAccessPath(role: Role | undefined, pathname: string) {
  if (!role) return false;
  if (pathname.startsWith(UNSUPPORTED_ROLE_ROUTE)) return true;

  const route = APP_ROUTES.find((item) => pathname.startsWith(item.href));
  if (!route) return true;

  return route.allowedRoles.includes(role);
}

export function getVisibleRoutes(role: Role | undefined) {
  if (!role) return [];
  return APP_ROUTES.filter((route) => route.allowedRoles.includes(role));
}

export function getDefaultRouteForRole(role: Role | undefined) {
  if (role && ROLE_HOME_ROUTE[role] && canAccessPath(role, ROLE_HOME_ROUTE[role]!)) {
    return ROLE_HOME_ROUTE[role]!;
  }
  const firstRoute = getVisibleRoutes(role)[0];
  return firstRoute?.href ?? UNSUPPORTED_ROLE_ROUTE;
}

export const WRITE_ROLES: Role[] = [Role.ADMIN, Role.MANAGER];
export const canWrite = (role?: Role) => !!role && WRITE_ROLES.includes(role);
export const canManageUsers = (role?: Role) => role === Role.ADMIN;
export const canViewCompensation = (role?: Role) =>
  role === Role.ADMIN || role === Role.MANAGER;

export function getRouteWriteRoles(pathname: string): Role[] | undefined {
  const route = APP_ROUTES.find((item) => pathname.startsWith(item.href));
  return route?.writeRoles;
}

export function canWriteOnRoute(role: Role | undefined, pathname: string) {
  if (!role) return false;
  const writeRoles = getRouteWriteRoles(pathname);
  if (!writeRoles) return false;
  return writeRoles.includes(role);
}
