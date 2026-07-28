import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Evo Rentals — Fleet Management ERP",
    template: "%s | Evo Rentals",
  },
  description:
    "Enterprise fleet management platform for electric two-wheeler rentals. Manage bookings, customers, vehicles, payments, and more.",
  keywords: [
    "fleet management",
    "electric vehicle",
    "rental management",
    "ERP",
    "two-wheeler rental",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <ToastProvider />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
