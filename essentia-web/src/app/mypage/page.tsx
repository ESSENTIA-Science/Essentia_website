'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import styles from "./page.module.css";

type Member = {
    id: string;
    name: string;
    email: string;
    provider: string | null;
    birth: string | null;
    sex: string | null;
    school: string | null;
    class: number | null;
    subClass: string | null;
    depth_1: string | null;
    depth_2: string | null;
    depth_3: string | null;
    member_code: string | null;
};

type Org = {
    id: string;
    name: string;
    parent_id: string | null;
    depth: number;
};

export default function mypage () {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [member, setMember] = useState<Member | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adminError, setAdminError] = useState<string | null>(null);
    const [orgForm, setOrgForm] = useState({ name: "", parent_id: "", depth: 1 });
    const [memberPage, setMemberPage] = useState(1);
    const pageSize = 10;
    const [memberFilter, setMemberFilter] = useState("all");
    const [memberQuery, setMemberQuery] = useState("");

    const loadMember = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to load member');
            setMember(data.member);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
        } finally {
            setLoading(false);
            setChecked(true);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && !checked) {
            loadMember();
        }
    }, [status, checked]);

    const loadAdminData = async () => {
        if (!member || (member.class !== 0 && member.class !== 1)) return;
        setAdminError(null);
        try {
            const [membersRes, orgRes] = await Promise.all([
                fetch(`/api/admin/members?ts=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/admin/organizations?ts=${Date.now()}`, { cache: 'no-store' }),
            ]);
            const membersData = await membersRes.json();
            const orgData = await orgRes.json();
            console.log('[Admin] members', membersData);
            console.log('[Admin] organizations', orgData);
            if (!membersRes.ok) throw new Error(membersData?.error ?? 'Failed to load members');
            if (!orgRes.ok) throw new Error(orgData?.error ?? 'Failed to load organizations');
            setMembers(membersData.members ?? []);
            setOrgs(orgData.organizations ?? []);
            setMemberPage(1);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    useEffect(() => {
        if (member && (member.class === 0 || member.class === 1)) {
            loadAdminData();
        }
    }, [member?.class]);
    
    useEffect(() => {
        if (status === 'authenticated' && checked && !loading && member === null) {
            router.push('/onboarding');
        }
    }, [status, checked, loading, member, router]);

    const getClassLabel = (value: number | null) => {
        if (value === 0) return '회장';
        if (value === 1) return '임원진';
        if (value === 2) return '회원';
        if (value === 3) return '관계자';
        if (value === 4) return '외부인';
        return '-';
    };

    const getSexLabel = (value: string | null) => {
        if (value === 'male') return '남';
        if (value === 'female') return '여';
        return '-';
    };

    const filteredMembers = members.filter((item) => {
        const matchQuery =
            memberQuery.trim().length === 0 ||
            item.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(memberQuery.toLowerCase());

        const matchClass =
            memberFilter === "all" ||
            (memberFilter === "임원진" && item.class === 1) ||
            (memberFilter === "회원" && item.class === 2) ||
            (memberFilter === "관계자" && item.class === 3) ||
            (memberFilter === "외부인" && item.class === 4);

        return matchQuery && matchClass;
    });

    const updateMember = async (payload: { id: string; class?: number; depth_1?: string }) => {
        setAdminError(null);
        try {
            const res = await fetch('/api/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to update member');
            await loadAdminData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    const createOrg = async (event: React.FormEvent) => {
        event.preventDefault();
        setAdminError(null);
        try {
            const res = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: orgForm.name,
                    parent_id: orgForm.parent_id || null,
                    depth: Number(orgForm.depth),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to create organization');
            setOrgForm({ name: '', parent_id: '', depth: 1 });
            await loadAdminData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    const deleteOrg = async (id: string) => {
        if (!confirm('부서를 삭제하시겠습니까?')) return;
        setAdminError(null);
        try {
            const res = await fetch(`/api/admin/organizations?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to delete organization');
            await loadAdminData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    if (status === 'loading' || loading) {
        return <LoadingScreen message="로딩중" />;
    }

    if (status !== 'authenticated') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h1 className={styles.title}>마이페이지</h1>
                    <p className={styles.subtitle}>로그인이 필요합니다.</p>
                    <button className={styles.primaryButton} type="button" onClick={() => signIn()}>
                        로그인 하러가기
                    </button>
                </div>
            </div>
        );
    }

    return(
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>마이페이지</h1>
                {error && <p className={styles.error}>{error}</p>}
                {loading && <p className={styles.helper}>처리 중...</p>}
                {member ? (
                    <div className={styles.infoGrid}>
                        <div className={styles.infoName}>
                            <p className={styles.label}>이름</p>
                            <p className={styles.value}>{member.name}</p>
                        </div>
                        <div className={styles.infoEmail}>
                            <p className={styles.label}>이메일</p>
                            <p className={styles.value}>{member.email}</p>
                        </div>
                        <div className={styles.infoBirth}>
                            <p className={styles.label}>생일</p>
                            <p className={styles.value}>{member.birth ?? '-'}</p>
                        </div>
                        <div className={styles.infoSex}>
                            <p className={styles.label}>성별</p>
                            <p className={styles.value}>{getSexLabel(member.sex)}</p>
                        </div>
                        <div className={styles.infoSchool}>
                            <p className={styles.label}>학교</p>
                            <p className={styles.value}>{member.school ?? '-'}</p>
                        </div>
                        <div className={styles.infoDept}>
                            <p className={styles.label}>소속</p>
                            <p className={styles.value}>{member.depth_1 ?? '-'}</p>
                        </div>
                        <div className={styles.infoClass}>
                            <p className={styles.label}>등급</p>
                            <p className={styles.value}>{getClassLabel(member.class)}</p>
                        </div>
                        <button
                            className={styles.secondaryButton + " " + styles.logoutButton}
                            type="button"
                            onClick={() => signOut({ callbackUrl: "/" })}
                        >
                            로그아웃
                        </button>
                    </div>
                ) : (
                    <p className={styles.helper}>기본 정보를 확인하는 중입니다.</p>
                )}
            </div>
            {member && (member.class === 0 || member.class === 1) && (
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
                            <option value="관계자">관계자</option>
                            <option value="외부인">외부인</option>
                        </select>
                        <input
                            className={styles.input}
                            placeholder="이름 또는 이메일 검색"
                            value={memberQuery}
                            onChange={(event) => {
                                setMemberQuery(event.target.value);
                                setMemberPage(1);
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
                                        value={item.class ?? 4}
                                        onChange={(event) => {
                                            const nextClass = Number(event.target.value);
                                            if (nextClass === 0) return;
                                            updateMember({ id: item.id, class: nextClass });
                                        }}
                                    >
                                        <option value={1}>임원진</option>
                                        <option value={2}>회원</option>
                                        <option value={3}>관계자</option>
                                        <option value={4}>외부인</option>
                                    </select>
                                </div>
                                <div className={styles.adminListOrg}>
                                    <p className={styles.label}>부서</p>
                                    <select
                                        className={styles.select}
                                        value={item.depth_1 ?? ''}
                                        onChange={(event) => updateMember({ id: item.id, depth_1: event.target.value })}
                                    >
                                        <option value="">미지정</option>
                                        {orgs.filter((org) => org.depth === 1).map((org) => (
                                            <option key={org.id} value={org.name}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.adminListCode}>
                                    <p className={styles.label}>회원코드</p>
                                    <p className={styles.value}>{item.member_code ?? '-'}</p>
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
                                <span>{org.name} (depth {org.depth})</span>
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
            )}
        </div>
    )
}
