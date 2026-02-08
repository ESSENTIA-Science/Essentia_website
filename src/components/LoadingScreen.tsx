"use client";

import styles from "./LoadingScreen.module.css";

export default function LoadingScreen({ message = "로딩중" }: { message?: string }) {
  return (
    <div className={styles.loadingPage}>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
