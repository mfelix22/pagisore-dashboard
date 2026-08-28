import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PAGISORE Guild Dashboard",
  description: "PAGISORE Ragnarok Origin Classic guild management system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#1e1f22] text-[#f2f3f5]">
        <header className="border-b border-[#2b2d31] bg-[#1e1f22] px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold text-white hover:text-[#b5bac1]"
            >
              PAGISORE
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-[#b5bac1] hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/members"
                className="text-sm font-medium text-[#b5bac1] hover:text-white"
              >
                Members
              </Link>
              <Link
                href="/eo"
                className="text-sm font-medium text-[#b5bac1] hover:text-white"
              >
                EO
              </Link>
              <Link
                href="/attendance"
                className="text-sm font-medium text-[#b5bac1] hover:text-white"
              >
                Attendance
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
