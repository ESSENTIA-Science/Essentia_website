"use client"

import Link from "next/link";
import styles from "./page.module.css";
import Galaxy from "@/components/Galaxy";


export default function Home() {

  return (
    <div className={styles.page}>
      <div className={styles.scrollContainer} id="scrollRoot">
        <section className={`${styles.hero} ${styles.scrollArea}`}>
          <div className={`${styles.background} background`}>
            <Galaxy starSpeed={0.5} density={1} hueShift={140} speed={0.3} glowIntensity={0.2} saturation={0} mouseRepulsion={false} mouseInteraction={false} repulsionStrength={0} twinkleIntensity={0.3} rotationSpeed={0.05} transparent />
          </div>
          <div className={styles.heroContent}>
            <p className={styles.heroText}>DECIFRA NATURAM</p>
            <p className={styles.heroDesc}>자연을 해독하라</p>
          </div>
          <div className={styles.mouse}></div>
        </section>
        <section className={`${styles.about} ${styles.scrollArea}`} id="navBright">
          <div className={styles.aboutContent}>
            <div className={styles.aboutTitle}>
              <img className={styles.aboutLogo} src="./icon.svg"></img>
              <div className={styles.aboutText}>
                <p className={styles.contentTitle}>ESSENTIA Science</p>
                <p className={styles.contentDesc}>ESSENTIA 과학회는 시험 성적으로는 드러나지 않는 과학적 열정과 잠재력을 가진 학생들을 위한 비공인 과학회입니다. 학교에서 경험하기 어려운 깊이 있는 탐구와 교류의 기회를 통해, 진정한 과학 인재로 성장할 수 있는 환경을 만드는 것을 목표로 합니다</p>
              </div>
            </div>
            <div className={styles.aboutButtons}>
              <Link className={styles.aboutButton} href="/about">Who We Are</Link>
              <Link className={styles.aboutButton} href="/projects">Project</Link>
              <Link className={styles.aboutButton} href="/forum">게시판</Link>
              <Link className={styles.aboutButton} href="/contact">입회신청</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


