
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppStateProvider } from '@/context/app-state-provider';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/app/theme-provider';
import MainLayout from '@/components/app/main-layout';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'] 
});

const APP_NAME = "BiharSchoolRoutine";
const APP_DEFAULT_TITLE = "BiharSchoolRoutine";
const APP_TITLE_TEMPLATE = "%s - BiharSchoolRoutine";
const APP_DESCRIPTION = "AI-Powered School Routine Generator for Bihar";

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
    apple: "/icons/apple-touch-icon.png",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppStateProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </AppStateProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
