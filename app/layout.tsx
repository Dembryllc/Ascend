import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascend | SAT Tutor",
  description: "A simple digital SAT tutor for score reports, modules, practice, and weekly study plans."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
