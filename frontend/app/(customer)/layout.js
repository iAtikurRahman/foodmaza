import Navbar from "@/components/customer/Navbar";

/**
 * Shared chrome for every customer-facing route.
 * (Route-group folder: never appears in the URL.)
 */
export default function CustomerLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 bg-white py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        Foodmaza — demo restaurant management system
      </footer>
    </div>
  );
}
