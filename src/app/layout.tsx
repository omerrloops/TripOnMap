import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bulgaria Trip Map",
  description: "Interactive map of our family trip to Bulgaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="text-center py-4 text-2xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md animate-pulse">
          Bulgaria Trip Map
        </header>
        {children}
      </body>
    </html>
  );
}
