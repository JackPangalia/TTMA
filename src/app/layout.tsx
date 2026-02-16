import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTMA — Tool Tracker",
  description:
    "WhatsApp-powered tool tracking for job sites. Check tools in and out via text.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
