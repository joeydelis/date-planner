import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Date Planner",
  description: "A shared couple date planner with activities, itineraries, calendar exports, and stats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
