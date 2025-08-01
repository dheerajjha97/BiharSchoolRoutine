
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppStateProvider } from '@/context/app-state-provider';
import AppShell from '@/components/app/app-shell';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BiharSchoolRoutine',
  description: 'AI-Powered School Routine Generator',
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
