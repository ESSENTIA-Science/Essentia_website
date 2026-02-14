"use client";

import styles from "./page.module.css";

export default function ObviumNihilPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Project</p>
        <h1 className={styles.title}>Obvium Nihil</h1>
      </header>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>프로젝트 내용</h2>
        <p className={styles.body}>
          ESSENTIA Science에 속한 연구팀으로, 모든 연구 내용은 공식적인 개제 전까진
          공개되지 않습니다. 현재 진행중 입니다. 현재까지 공식 학술지 1회 거절 당했으며,
          또다른 공식 학술지에서 심사중 입니다.
        </p>
        <h3 className={styles.sectionTitle}>진행 멤버</h3>
        <p className={styles.body}>
          박현빈, 헌셔효, 최해준, 양성재, 현영준
        </p>
      </section>
    </div>
  );
}
