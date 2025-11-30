"use client";
import { ReactNode } from "react";
import AuthGate from "./AuthGate";
import RoleBasedNavigation from "./RoleBasedNavigation";
import ClientNavigation from "./ClientNavigation";
import ToastContainer from "./Toast";
import GlobalSearch from "./GlobalSearch";
import NotificationSystem from "./NotificationSystem";
import KeyboardShortcuts from "./KeyboardShortcuts";
import ThemeSelector from "./ThemeSelector";

type ClientLayoutProps = {
  children: ReactNode;
  title?: string;
  showNavigation?: boolean;
};

export default function ClientLayout({ 
  children, 
  title = "DringDring Client",
  showNavigation = true 
}: ClientLayoutProps) {
  return (
    <AuthGate>
      <RoleBasedNavigation>
        <ToastContainer />
        <div className="h-screen flex overflow-hidden bg-gray-100">
          {showNavigation && <ClientNavigation />}
        
        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <div className="w-full flex md:ml-0">
                  <GlobalSearch role="client" />
                </div>
              </div>
              <div className="ml-4 flex items-center md:ml-6 space-x-2">
                {/* Notifications */}
                <NotificationSystem userId="client_user" role="client" />
                
                {/* Theme Selector */}
                <ThemeSelector />
                
                {/* Keyboard Shortcuts */}
                <KeyboardShortcuts role="client" />
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      </RoleBasedNavigation>
    </AuthGate>
  );
}
