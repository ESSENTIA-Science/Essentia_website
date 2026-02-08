"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type Profile = {
  members: { president: boolean | null } | null;
  applicants: { status: string | null } | null;
};

export default function ApplyPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ school: "", intro: "", motivation: "", agreed: false });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMember = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        const profile = data.member as Profile | null;
        if (profile?.members) {
          alert("넌 못 지나간다");
          router.replace("/");
          return;
        }
        if (profile?.applicants?.status) {
          setDone(true);
        }
      } catch {
        return;
      }
    };

    loadMember();
  }, [status, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "apply" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit application");
      setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className={styles.page}>로딩중</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>입회 신청</h1>
          <p className={styles.subtitle}>로그인이 필요합니다.</p>
          <button className={styles.primaryButton} type="button" onClick={() => signIn()}>
            로그인 하러가기
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>입회 신청</h1>
          <p className={styles.subtitle}>입회 신청이 완료 되었습니다. 추후 연락드리겠습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>입회 신청</h1>
        {error && <p className={styles.error}>{error}</p>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.pledgeBox}>
            <h2 className={styles.pledgeTitle}>입회 서약서</h2>
            <p className={styles.pledgeText}>
              본인은 ESSENTIA 과학회의 회원으로서, 아래 규칙과 서약 사항을 확인·숙지하였으며 이에 전적으로 동의합니다.
            </p>
            <h3 className={styles.pledgeSection}>제1조 (목적)</h3>
            <ol className={styles.pledgeList}>
              <li>본 규정은 과학과 수학을 지향하는 본 과학회의 건전한 연구 활동과 회원 간의 상호 존중을 유지하기 위함을 목적으로 한다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제2조 (법령 준수)</h3>
            <ol className={styles.pledgeList}>
              <li>모든 회원은 대한민국의 헌법 및 관계 법령을 준수하며, 불법 행위에 관여하지 않는다.</li>
              <li>본 조항의 1항을 위반 할 경우의 책임은 단체와 관련되지 않은 타 회원이 아닌 위반자 본인이 책임진다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제3조 (존중과 책임)</h3>
            <ol className={styles.pledgeList}>
              <li>회원은 상호 존중과 책임 있는 태도로 활동한다.</li>
              <li>회원간의 갈등에 관해 본 단체와 갈등과 관련되지 않은 다른 회원들은 어떠한 법적 책임도 지지 않는다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제4조 (연구 윤리)</h3>
            <ol className={styles.pledgeList}>
              <li>표절, 데이터 조작, 허위 보고 등 연구 부정행위를 금지하며, 모든 성과물은 정직하고 투명하게 작성한다.</li>
              <li>본 조항의 1항을 위반 할 경우의 책임은 단체와 관련되지 않은 타 회원이 아닌 위반자 본인이 책임진다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제5조 (안전 준수)</h3>
            <ol className={styles.pledgeList}>
              <li>실험·제작·현장 활동 시 안전수칙을 준수하고, 타인의 생명·신체·재산에 위험을 초래하는 행위를 하지 않는다.</li>
              <li>본 조항의 1항을 위반 할 경우의 책임은 단체와 관련되지 않은 타 회원이 아닌 위반자 본인이 책임진다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제6조 (정보 보호)</h3>
            <ol className={styles.pledgeList}>
              <li>회원 및 제3자의 개인정보, 저작물, 내부 자료를 무단으로 수집·유출·사용하지 않는다.</li>
              <li>본 조항의 1항을 위반 할 경우의 책임은 단체와 관련되지 않은 타 회원이 아닌 위반자 본인이 책임진다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제7조 (단체 입회)</h3>
            <ol className={styles.pledgeList}>
              <li>본 단체에 입회 하고자 하는 자의 입회 여부는 본 단체의 권한이며, 합격과 불합격 여부에 관하여 본 단체는 어떠한 법적 책임도 지지 않는다.</li>
            </ol>
            <h3 className={styles.pledgeSection}>제8조 (단체 명예)</h3>
            <ol className={styles.pledgeList}>
              <li>회원은 단체의 명예를 훼손하는 언행이나 활동을 하지 않는다.</li>
            </ol>
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(event) => setForm({ ...form, agreed: event.target.checked })}
              required
            />
            입회 서약서의 내용에 동의합니다.
          </label>
          <label className={styles.field}>
            <span>학교</span>
            <input
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
              placeholder="미재학 시 미재학 입력"
              required
            />
          </label>
          <label className={styles.field}>
            <span>자기 소개</span>
            <textarea
              value={form.intro}
              onChange={(event) => setForm({ ...form, intro: event.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>입회 동기</span>
            <textarea
              value={form.motivation}
              onChange={(event) => setForm({ ...form, motivation: event.target.value })}
              required
            />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={loading}>
            제출하기
          </button>
        </form>
      </div>
    </div>
  );
}
