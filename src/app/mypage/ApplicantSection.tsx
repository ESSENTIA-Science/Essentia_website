"use client";

import type { Dispatch, SetStateAction } from "react";
import styles from "./page.module.css";
import type { ApplicantInfo, ApplicantProgress } from "./types";

type Props = {
  applicantProgress: ApplicantProgress | null;
  applicantStatus: string | null;
  applicants: ApplicantInfo | null;
  interviewChoices: string[];
  setInterviewChoices: Dispatch<SetStateAction<string[]>>;
  interviewSubmitting: boolean;
  interviewFeedback: string | null;
  onSubmitInterviewChoices: () => void;
};

export default function ApplicantSection({
  applicantProgress,
  applicantStatus,
  applicants,
  interviewChoices,
  setInterviewChoices,
  interviewSubmitting,
  interviewFeedback,
  onSubmitInterviewChoices,
}: Props) {
  if (!applicantProgress) return null;

  return (
    <section className={styles.applicantSection}>
      <h2 className={styles.sectionTitle}>입회 진행상황</h2>
      <div className={styles.adminList}>
        <div className={styles.applicantCard}>
          <div>
            <p className={styles.label}>상태</p>
            <p className={styles.value}>{applicantProgress.statusLabel}</p>
          </div>
          <div>
            <p className={styles.label}>다음 단계</p>
            <p className={styles.value}>{applicantProgress.nextLabel}</p>
          </div>
          <div>
            <p className={styles.label}>안내</p>
            <p className={styles.value}>{applicantProgress.message}</p>
          </div>
        </div>
      </div>
      {applicantStatus === "doc_passed" && (
        <div className={styles.interviewCard}>
          <div className={styles.interviewField}>
            <p className={styles.label}>면접 1순위</p>
            <input
              className={styles.dateInput}
              type="datetime-local"
              value={interviewChoices[0] ?? ""}
              onChange={(event) =>
                setInterviewChoices((prev) => {
                  const next = [...prev];
                  next[0] = event.target.value;
                  return next;
                })
              }
            />
          </div>
          <div className={styles.interviewField}>
            <p className={styles.label}>면접 2순위</p>
            <input
              className={styles.dateInput}
              type="datetime-local"
              value={interviewChoices[1] ?? ""}
              onChange={(event) =>
                setInterviewChoices((prev) => {
                  const next = [...prev];
                  next[1] = event.target.value;
                  return next;
                })
              }
            />
          </div>
          <div className={styles.interviewField}>
            <p className={styles.label}>면접 3순위</p>
            <input
              className={styles.dateInput}
              type="datetime-local"
              value={interviewChoices[2] ?? ""}
              onChange={(event) =>
                setInterviewChoices((prev) => {
                  const next = [...prev];
                  next[2] = event.target.value;
                  return next;
                })
              }
            />
          </div>
          <div className={styles.interviewActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={onSubmitInterviewChoices}
              disabled={interviewSubmitting}
            >
              선택 완료
            </button>
            {interviewFeedback && (
              <p className={styles.helper}>{interviewFeedback}</p>
            )}
          </div>
        </div>
      )}
      <div className={styles.applicantDocs}>
        <div className={styles.applicantDoc}>
          <p className={styles.label}>자기소개서</p>
          <p className={styles.docContent}>
            {applicants?.doc_introduction?.trim() || "-"}
          </p>
        </div>
        <div className={styles.applicantDoc}>
          <p className={styles.label}>입회 동기</p>
          <p className={styles.docContent}>
            {applicants?.doc_motive?.trim() || "-"}
          </p>
        </div>
      </div>
    </section>
  );
}
