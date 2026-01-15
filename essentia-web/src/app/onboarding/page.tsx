'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import styles from './page.module.css';

export default function Onboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', birth: '', sex: '' });

  useEffect(() => {
    if (status === 'authenticated') {
      setForm(prev => ({
        name: prev.name || session?.user?.name || '',
        birth: prev.birth,
        sex: prev.sex,
      }));
    }
  }, [status, session]);

  useEffect(() => {
    const checkMember = async () => {
      if (status !== 'authenticated' || checked || loading) return;
      try {
        const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Failed to load member');
        if (data.member) {
          router.replace('/mypage');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setChecked(true);
      }
    };

    checkMember();
  }, [status, checked, loading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to save member');
      router.replace('/mypage');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading || (status === 'authenticated' && !checked)) {
    return <LoadingScreen message="로딩중" />;
  }

  if (status !== 'authenticated') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>추가 정보 입력</h1>
          <p className={styles.subtitle}>로그인이 필요합니다.</p>
          <button className={styles.primaryButton} type="button" onClick={() => signIn()}>
            로그인 하러가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>추가 정보 입력</h1>
        {error && <p className={styles.error}>{error}</p>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>이름</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>생년월일</span>
            <input
              type="date"
              value={form.birth}
              onChange={(event) => setForm({ ...form, birth: event.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>성별</span>
            <select
              value={form.sex}
              onChange={(event) => setForm({ ...form, sex: event.target.value })}
              required
            >
              <option value="">선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={loading}>
            저장하기
          </button>
        </form>
      </div>
    </div>
  );
}
