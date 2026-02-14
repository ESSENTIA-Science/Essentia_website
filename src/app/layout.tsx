import type { Metadata } from "next";
import localFont from "next/font/local";
import NavBar from '@/components/CardNav';
import AppSessionProvider from '@/components/SessionProvider';
import "./globals.css";

const pretendard = localFont({
  src: [
    { path: "./fonts/woff2/Pretendard-Thin.woff2", weight: "100", style: "normal" },
    { path: "./fonts/woff2/Pretendard-ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "./fonts/woff2/Pretendard-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/woff2/Pretendard-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/woff2/Pretendard-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/woff2/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/woff2/Pretendard-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/woff2/Pretendard-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/woff2/Pretendard-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-pretendard",
  display: "swap",
});


export const metadata: Metadata = {
  title: "ESSENTIA Science",
  description: "ESSENTIA 과학회는 시험 성적으로는 드러나지 않는 과학적 열정과 잠재력을 가진 학생들을 위한 비공인 과학회입니다. 학교에서 경험하기 어려운 깊이 있는 탐구와 교류의 기회를 통해, 진정한 과학 인재로 성장할 수 있는 환경을 만드는 것을 목표로 합니다",
  themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  icons: {
      icon: "/logo.png",
  },
  openGraph: {
    title: "ESSENTIA Science",
    description:
      "시험 성적만이 아닌 과학적 열정으로 성장하는 학생 과학회",
    images: ["/og.png"],
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} ${pretendard.variable}`}>
        <AppSessionProvider>
          <NavBar />
          <div className="app-content">{children}</div>
        </AppSessionProvider>
      </body>
    </html>
  );
}
