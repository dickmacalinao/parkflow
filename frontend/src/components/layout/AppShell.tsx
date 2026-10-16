import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell() {
  return (
    // h-dvh, not h-screen: on iPhone Safari 100vh is the height with the browser toolbar
    // retracted, so h-screen lets the toolbar cover the bottom of the page (including the
    // tab bar). dvh tracks the visible viewport.
    <div className="flex h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
