
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppStateProvider } from '@/context/app-state-provider';
import AppShell from '@/components/app/app-shell';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const APP_NAME = "BiharSchoolRoutine";
const APP_DEFAULT_TITLE = "BiharSchoolRoutine";
const APP_TITLE_TEMPLATE = "%s - School Routine";
const APP_DESCRIPTION = "AI-Powered School Routine Generator";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: "/favicon.ico",
    apple: "/icons/calendar-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppStateProvider>
          <AppShell>
            {children}
          </AppShell>
        </AppStateProvider>
        <Toaster />
      </body>
    </html>
  );
}
