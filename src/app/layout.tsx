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
        <header className="fixed top-0 left-0 right-0 z-50 text-center py-4 text-xl sm:text-2xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
          Bulgaria Trip Map
        </header>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
