import AdminShell from "@/components/admin/AdminShell";

/**
 * Admin route group layout. Route groups never appear in the URL, so these
 * pages live at /admin, /admin/orders, /admin/menu and /admin/reviews.
 * The client-side guard in AdminShell protects every one of them.
 */
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
