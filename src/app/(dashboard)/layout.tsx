import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Dashboardsidebar } from "@/modules/dashboard/ui/components/dashboard_sidebar";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
interface Props {
    childern: React.ReactNode;
}

const layout = ({ childern }: Props) => {
  return (
    <SidebarProvider>
        <Dashboardsidebar/>
        <main className="flex flex-col h-screen w-screen bg-muted">
          <DashboardNavbar/>
        {childern}
        </main>
    </SidebarProvider>
  );
};

export default layout;