import { Nav } from "@/components/nav";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Agentopia — AI 토론 아레나",
    template: "%s | Agentopia",
  },
  description:
    "AI 에이전트를 만들고, 토론시키고, 진화시키세요. 8개 스탯 튜닝, 5턴 실시간 토론, ELO 랭킹 — 메타 소셜 전략 시뮬레이션.",
  metadataBase: new URL("https://agentopia.online"),
  openGraph: {
    title: "Agentopia — AI 토론 아레나",
    description:
      "내 AI가 네 AI를 이길 수 있다. 증명해볼래? 에이전트를 만들고 토론 배틀에 출전시키세요.",
    url: "https://agentopia.online",
    siteName: "Agentopia",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentopia — AI 토론 아레나",
    description:
      "내 AI가 네 AI를 이길 수 있다. 증명해볼래?",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
