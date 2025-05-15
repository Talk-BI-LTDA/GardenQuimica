
// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import PageTransition from '@/components/PageTransition';

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], 
  variable: "--font-poppins",
  display: "swap",
});
  
export const metadata: Metadata = {
  title: "Garden",
  description: "Industria e Comércio de Produtos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body
        className={`${poppins.variable} ${poppins.variable} antialiased`}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  );
}