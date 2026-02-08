"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import styles from "./page.module.css";
import type { MemberRole, Org, User } from "./types";

type StatusOption = { value: string; label: string };

type Props = {
  adminError: string | null;
  memberFilter: string;
  setMemberFilter: Dispatch<SetStateAction<string>>;
  memberQuery: string;
  setMemberQuery: Dispatch<SetStateAction<string>>;
  memberPage: number;
  setMemberPage: Dispatch<SetStateAction<number>>;
  applicantPage: number;
  setApplicantPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  filteredMembers: User[];
  filteredApplicants: User[];
  getMemberRole: (item: User) => MemberRole;
  handleRoleChange: (id: string, nextRole: MemberRole, currentOrg: string | null) => void;
  updateMember: (payload: {
    id: string;
    president?: boolean;
    org?: string | null;
    applicantStatus?: string;
  }) => void | Promise<unknown>;
  orgs: Org[];
  orgForm: { name: string; parent_id: string; depth: number };
  setOrgForm: Dispatch<SetStateAction<{ name: string; parent_id: string; depth: number }>>;
  createOrg: (event: FormEvent) => void;
  deleteOrg: (id: string) => void;
  applicantStatusOptions: StatusOption[];
  getApplicantStatusValue: (status: string | null) => string;
  formatKstLabel: (value?: string | null) => string;
  formatDateTimeKst: (value?: string | null) => string;
  adminInterviewTimes: Record<string, string>;
  setAdminInterviewTimes: Dispatch<SetStateAction<Record<string, string>>>;
  sendInterviewNotice: (userId: string, interviewValue: string) => void;
  noticeSendingId: string | null;
  noticeFeedback: Record<string, string>;
};

export default function AdminSection({
  adminError,
  memberFilter,
  setMemberFilter,
  memberQuery,
  setMemberQuery,
  memberPage,
  setMemberPage,
  applicantPage,
  setApplicantPage,
  pageSize,
  filteredMembers,
  filteredApplicants,
  getMemberRole,
  handleRoleChange,
  updateMember,
  orgs,
  orgForm,
  setOrgForm,
  createOrg,
  deleteOrg,
  applicantStatusOptions,
  getApplicantStatusValue,
  formatKstLabel,
  formatDateTimeKst,
  adminInterviewTimes,
  setAdminInterviewTimes,
  sendInterviewNotice,
  noticeSendingId,
  noticeFeedback,
}: Props) {
  return (
    <section className={styles.adminSection}>
      <h2 className={styles.sectionTitle}>회원 관리</h2>
      {adminError && <p className={styles.error}>{adminError}</p>}
      <div className={styles.filterRow}>
        <select
          className={styles.select}
          value={memberFilter}
          onChange={(event) => {
            setMemberFilter(event.target.value);
            setMemberPage(1);
          }}
        >
          <option value="all">전체</option>
          <option value="임원진">임원진</option>
          <option value="회원">회원</option>
          <option value="외부인">외부인</option>
          <option value="입회 희망자">입회 희망자</option>
        </select>
        <input
          className={styles.input}
          placeholder="이름 또는 이메일 검색"
          value={memberQuery}
          onChange={(event) => {
            setMemberQuery(event.target.value);
            setMemberPage(1);
            setApplicantPage(1);
          }}
        />
      </div>
      <div className={styles.pagination}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => setMemberPage((prev) => Math.max(1, prev - 1))}
          disabled={memberPage === 1}
        >
          이전
        </button>
        <span className={styles.pageLabel}>
          {memberPage} / {Math.max(1, Math.ceil(filteredMembers.length / pageSize))}
        </span>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() =>
            setMemberPage((prev) =>
              Math.min(Math.ceil(filteredMembers.length / pageSize), prev + 1)
            )
          }
          disabled={memberPage >= Math.ceil(filteredMembers.length / pageSize)}
        >
          다음
        </button>
      </div>
      <div className={styles.adminList}>
        {filteredMembers
          .slice((memberPage - 1) * pageSize, memberPage * pageSize)
          .map((item) => (
            <div key={item.id} className={styles.adminCard}>
              <div className={styles.adminListName}>
                <p className={styles.label}>이름</p>
                <p className={styles.value}>{item.name}</p>
              </div>
              <div className={styles.adminListEmail}>
                <p className={styles.label}>이메일</p>
                <p className={styles.value}>{item.email}</p>
              </div>
              <div className={styles.adminListClass}>
                <p className={styles.label}>등급</p>
                <select
                  className={styles.select}
                  value={getMemberRole(item)}
                  onChange={(event) =>
                    handleRoleChange(
                      item.id,
                      event.target.value as MemberRole,
                      item.members?.org ?? null
                    )
                  }
                >
                  <option value="president">임원진</option>
                  <option value="member">회원</option>
                  <option value="external">외부인</option>
                </select>
              </div>
              <div className={styles.adminListOrg}>
                <p className={styles.label}>부서</p>
                <select
                  className={styles.select}
                  value={item.members?.org ?? ""}
                  onChange={(event) =>
                    updateMember({
                      id: item.id,
                      org: event.target.value ? event.target.value : null,
                    })
                  }
                >
                  <option value="">미지정</option>
                  {orgs
                    .filter((org) => org.depth === 1)
                    .map((org) => (
                      <option key={org.id} value={org.name}>
                        {org.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.adminListCode}>
                <p className={styles.label}>회원코드</p>
                <p className={styles.value}>{item.members?.member_code ?? "-"}</p>
              </div>
            </div>
          ))}
      </div>

      <h2 className={styles.sectionTitle}>입회 희망자 관리</h2>
      {adminError && <p className={styles.error}>{adminError}</p>}
      <div className={styles.filterRowSingle}>
        <input
          className={styles.input}
          placeholder="이름 또는 이메일 검색"
          value={memberQuery}
          onChange={(event) => {
            setMemberQuery(event.target.value);
            setMemberPage(1);
            setApplicantPage(1);
          }}
        />
      </div>
      <div className={styles.pagination}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => setApplicantPage((prev) => Math.max(1, prev - 1))}
          disabled={applicantPage === 1}
        >
          이전
        </button>
        <span className={styles.pageLabel}>
          {applicantPage} / {Math.max(1, Math.ceil(filteredApplicants.length / pageSize))}
        </span>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() =>
            setApplicantPage((prev) =>
              Math.min(Math.ceil(filteredApplicants.length / pageSize), prev + 1)
            )
          }
          disabled={applicantPage >= Math.ceil(filteredApplicants.length / pageSize)}
        >
          다음
        </button>
      </div>
      <div className={styles.adminList}>
        {filteredApplicants
          .slice((applicantPage - 1) * pageSize, applicantPage * pageSize)
          .map((item) => (
            <div key={item.id} className={styles.adminApplicantCard}>
              <div className={styles.adminListName}>
                <p className={styles.label}>이름</p>
                <p className={styles.value}>{item.name}</p>
              </div>
              <div className={styles.adminListEmail}>
                <p className={styles.label}>이메일</p>
                <p className={styles.value}>{item.email}</p>
              </div>
              <div className={styles.adminListClass}>
                <p className={styles.label}>상태</p>
                <select
                  className={styles.select}
                  value={getApplicantStatusValue(item.applicants?.status ?? null)}
                  onChange={(event) =>
                    updateMember({
                      id: item.id,
                      applicantStatus: event.target.value,
                    })
                  }
                >
                  {applicantStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.adminApplicantDetails}>
                <div className={styles.adminApplicantDetail}>
                  <p className={styles.label}>자기소개서</p>
                  <p className={styles.docContent}>
                    {item.applicants?.doc_introduction?.trim() || "-"}
                  </p>
                </div>
                <div className={styles.adminApplicantDetail}>
                  <p className={styles.label}>입회 동기</p>
                  <p className={styles.docContent}>
                    {item.applicants?.doc_motive?.trim() || "-"}
                  </p>
                </div>
                <div className={styles.adminApplicantDetail}>
                  <p className={styles.label}>면접 희망시간</p>
                  <p className={styles.docContent}>
                    1순위: {formatKstLabel(item.applicants?.interview_choice_1)}
                  </p>
                  <p className={styles.docContent}>
                    2순위: {formatKstLabel(item.applicants?.interview_choice_2)}
                  </p>
                  <p className={styles.docContent}>
                    3순위: {formatKstLabel(item.applicants?.interview_choice_3)}
                  </p>
                </div>
              </div>
              <div className={styles.adminApplicantActions}>
                <div className={styles.adminApplicantMenu}>
                  <span className={styles.label}>면접 확정 시간</span>
                  <input
                    className={styles.dateInput}
                    type="datetime-local"
                    value={
                      adminInterviewTimes[item.id] ??
                      formatDateTimeKst(item.applicants?.interview_at)
                    }
                    onChange={(event) =>
                      setAdminInterviewTimes((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() =>
                      sendInterviewNotice(
                        item.id,
                        adminInterviewTimes[item.id] ??
                          formatDateTimeKst(item.applicants?.interview_at)
                      )
                    }
                    disabled={noticeSendingId === item.id}
                  >
                    면접 공지 메일 발송하기
                  </button>
                  {noticeFeedback[item.id] && (
                    <span className={styles.helperInline}>
                      {noticeFeedback[item.id]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      <h2 className={styles.sectionTitle}>부서/과 관리</h2>
      <form className={styles.orgForm} onSubmit={createOrg}>
        <input
          className={styles.input}
          placeholder="이름"
          value={orgForm.name}
          onChange={(event) => setOrgForm({ ...orgForm, name: event.target.value })}
          required
        />
        <select
          className={styles.select}
          value={orgForm.parent_id}
          onChange={(event) => {
            const parentId = event.target.value;
            const parent = orgs.find((org) => org.id === parentId);
            const nextDepth = parent ? parent.depth + 1 : 1;
            setOrgForm({ ...orgForm, parent_id: parentId, depth: nextDepth });
          }}
        >
          <option value="">상위 없음</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <input
          className={styles.input}
          type="number"
          min={1}
          value={orgForm.depth}
          onChange={(event) => setOrgForm({ ...orgForm, depth: Number(event.target.value) })}
          readOnly={Boolean(orgForm.parent_id)}
        />
        <button className={styles.primaryButton} type="submit">
          추가
        </button>
      </form>
      <div className={styles.orgList}>
        {orgs.map((org) => (
          <div key={org.id} className={styles.orgRow}>
            <span>
              {org.name} (depth {org.depth})
            </span>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => deleteOrg(org.id)}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
