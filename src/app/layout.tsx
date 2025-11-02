import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../components/auth/AuthProvider";
import SecurityGuard from "../components/SecurityGuard";
import ConsoleCleaner from "../components/ConsoleCleaner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Production Scheduler ERP",
  description: "Production scheduling and management system for Polypacks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SecurityGuard />
          <ConsoleCleaner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}