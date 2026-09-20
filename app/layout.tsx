import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HOTEL } from "@/lib/rooms";

export const metadata: Metadata = {
  title: {
    default: `${HOTEL.name} — Takadanobaba, Tokyo`,
    template: `%s · ${HOTEL.name}`,
  },
  description:
    "Book directly with Green Hotel in Takadanobaba, Tokyo. Eight minutes' walk from the JR Yamanote Line, five minutes from Shinjuku.",
  openGraph: {
    title: `${HOTEL.name} — Takadanobaba, Tokyo`,
    description:
      "Book directly with Green Hotel in Takadanobaba, Tokyo. No platform fees.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
