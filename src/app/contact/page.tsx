"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GoMail } from "react-icons/go";
import { FaInstagram, FaYoutube, FaCheck, FaMoneyCheckAlt } from "react-icons/fa";
import styles from "./page.module.css";

type Member = {
  members: { president: boolean | null } | null;
  applicants: { status: string | null } | null;
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

  const canApply = !member?.members && !member?.applicants?.status;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 왼쪽 카드: 공식 채널 */}
        <div className={styles.channelsCard}>
          <h2 className={styles.cardTitle}>공식 채널</h2>
          <div className={styles.channelsList}>
            <a
              className={styles.channelItem}
              href={
                isMobile
                  ? "mailto:contact@essentia-sci.org"
                  : "https://mail.google.com/mail/?view=cm&fs=1&to=contact@essentia-sci.org"
              }
              target={isMobile ? undefined : "_blank"}
              rel={isMobile ? undefined : "noreferrer"}
            >
              <GoMail className={styles.emailIcon} />
              <div className={styles.channelContent}>
                <div className={styles.channelLabel}>이메일 문의</div>
                <div className={styles.channelValue}>contact@essentia-sci.org</div>
              </div>
            </a>
            <a
              className={styles.channelItem}
              href="https://www.instagram.com/essentia_science/"
              target="_blank"
              rel="noreferrer"
            >
              <FaInstagram className={styles.instagramIcon} />
              <div className={styles.channelContent}>
                <div className={styles.channelLabel}>인스타그램</div>
                <div className={styles.channelValue}>@essentia_science</div>
              </div>
            </a>
            <a
              className={styles.channelItem}
              href="https://www.youtube.com/channel/UC9H7S_5-qyza8o24m0R4htA"
              target="_blank"
              rel="noreferrer"
            >
              <FaYoutube className={styles.youtubeIcon} />
              <div className={styles.channelContent}>
                <div className={styles.channelLabel}>유튜브 채널</div>
                <div className={styles.channelValue}>ESSENTIA Science</div>
              </div>
            </a>
            <a
              className={styles.channelItem}
              target="_blank"
              rel="noreferrer"
            >
              <FaMoneyCheckAlt className={styles.moneyIcon} />
              <div className={styles.channelContent}>
                <div className={styles.channelLabel}>후원 문의</div>
                <div className={styles.channelValue}>토스뱅크 1001-5934-8033</div>
              </div>
            </a>
          </div>
        </div>

        {/* 오른쪽 카드: 새로운 회원을 기다립니다 */}
        <div className={styles.membershipCard}>
          <h2 className={styles.cardTitle}>새로운 회원을 기다립니다</h2>
          <p className={styles.membershipDescription}>
            본 과학회는 연구의 발전과 지식의 공유를 목적으로 합니다. 전문 연구자부터 학생까지, 과학을 사랑하는 누구나 정회원이 되어 특별한 혜택을 누릴 수 있습니다.
          </p>
          <ul className={styles.benefitsList}>
            <li className={styles.benefitItem}>
              <FaCheck className={styles.checkIcon} />
              <span>자유로운 연구환경</span>
            </li>
            <li className={styles.benefitItem}>
              <FaCheck className={styles.checkIcon} />
              <span>평가에서 벗어난 순수한 탐구기회</span>
            </li>
            <li className={styles.benefitItem}>
              <FaCheck className={styles.checkIcon} />
              <span>분야를 가리지않는 기회제공</span>
            </li>
          </ul>
          {(status !== "authenticated" || canApply) ? (
            status !== "authenticated" ? (
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => {
                  alert("로그인이 필요합니다.");
                  router.push("/login");
                }}
              >
                신입 회원 입회 신청하기 →
              </button>
            ) : (
              <Link className={styles.applyButton} href="/apply">
                신입 회원 입회 신청하기 →
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
