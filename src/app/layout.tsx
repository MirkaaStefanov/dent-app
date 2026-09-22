import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Д-р Джанел Аяз | Стоматолог Търговище - Записване на час",
  description:
    "Модерен стоматологичен кабинет в гр. Търговище. Професионално и безболезнено дентално лечение, естетика, избелване и профилактика. Запазете час онлайн за минута.",
  keywords: [
    "зъболекар Търговище",
    "стоматолог Търговище",
    "дентален кабинет Търговище",
    "Д-р Джанел Аяз",
    "записване на час зъболекар",
    "лечение на зъби Търговище",
    "почистване на зъбен камък",
  ],
  authors: [{ name: "Д-р Джанел Аяз" }],
  openGraph: {
    title: "Д-р Джанел Аяз | Стоматолог Търговище",
    description: "Професионална дентална грижа в гр. Търговище. Запишете час онлайн бързо и удобно.",
    type: "website",
    locale: "bg_BG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col bg-[#FAF8FC] text-slate-900 selection:bg-purple-200 selection:text-purple-900">
        {children}
      </body>
    </html>
  );
}
