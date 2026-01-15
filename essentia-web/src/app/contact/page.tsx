"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type Member = {
  class: number | null;
};

export default function ContactPage() {
  const { status } = useSession();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const loadMember = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        setMember(data.member ?? null);
      } catch {
        setMember(null);
      }
    };

    loadMember();
  }, [status]);

  useEffect(() => {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
  }, []);

  const canApply = member?.class === 3 || member?.class === 4;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.subtitle}>연락 채널과 입회 신청 안내</p>

        <div className={styles.buttonGroup}>
          <a
            className={styles.secondaryButton}
            href={
              isMobile
                ? "mailto:contact@essentia-sci.org"
                : "https://mail.google.com/mail/?view=cm&fs=1&to=contact@essentia-sci.org"
            }
            target={isMobile ? undefined : "_blank"}
            rel={isMobile ? undefined : "noreferrer"}
          >
            이메일
          </a>
          <a className={styles.secondaryButton} href="https://www.youtube.com/channel/UC9H7S_5-qyza8o24m0R4htA" target="_blank" rel="noreferrer">
            유튜브
          </a>
          <a className={styles.secondaryButton} href="https://www.instagram.com/essentia_science/" target="_blank" rel="noreferrer">
            인스타그램
          </a>
        </div>

        {(status !== "authenticated" || canApply) && (
          status !== "authenticated" ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                alert("로그인이 필요합니다.");
                router.push("/login");
              }}
            >
              입회 신청
            </button>
          ) : (
            <Link className={styles.applyButton} href="/apply">
              입회 신청
            </Link>
          )
        )}
      </div>
    </div>
  );
}
