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
  description: "국가와 인류를 위한 학문인 과학과 수학을 중시하며 연구원들과 인재들을 위한 비공인 학생 과학회.",
  icons: {
    icon: "./icon.svg"
  }
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
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
