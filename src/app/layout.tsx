
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppStateProvider } from '@/context/app-state-provider';
import AppShell from '@/components/app/app-shell';
import { Manrope } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BiharSchoolRoutine',
  description: 'AI-Powered School Routine Generator',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
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
