'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import styles from "./page.module.css";
import ApplicantSection from "./ApplicantSection";
import AdminSection from "./AdminSection";
import type { ApplicantInfo, ApplicantProgress, MemberRole, Org, User } from "./types";

export default function MyPage() {
    const { status } = useSession();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adminError, setAdminError] = useState<string | null>(null);
    const [orgForm, setOrgForm] = useState({ name: "", parent_id: "", depth: 1 });
    const [memberPage, setMemberPage] = useState(1);
    const [applicantPage, setApplicantPage] = useState(1);
    const pageSize = 10;
    const [memberFilter, setMemberFilter] = useState("all");
    const [memberQuery, setMemberQuery] = useState("");
    const [interviewChoices, setInterviewChoices] = useState<string[]>(["", "", ""]);
    const [interviewSubmitting, setInterviewSubmitting] = useState(false);
    const [interviewFeedback, setInterviewFeedback] = useState<string | null>(null);
    const [noticeSendingId, setNoticeSendingId] = useState<string | null>(null);
    const [noticeFeedback, setNoticeFeedback] = useState<Record<string, string>>({});
    const [adminInterviewTimes, setAdminInterviewTimes] = useState<Record<string, string>>({});

    const loadMember = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            console.log(data);
            if (!res.ok) throw new Error(data?.error ?? 'Failed to load member');
            setUser(data.member);
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
        if (!user || (user.members?.president !== true)) return;
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
            setApplicantPage(1);
            window.dispatchEvent(new Event('orgs:updated'));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    useEffect(() => {
        if (user?.members?.president === true) {
            loadAdminData();
        }
    },[user]);
    
    useEffect(() => {
        if (status === 'authenticated' && checked && !loading && user === null) {
            router.push('/onboarding');
        }
    }, [status, checked, loading, user, router]);

    useEffect(() => {
        if (!user?.applicants) return;
        setInterviewChoices([
            formatDateTimeKst(user.applicants.interview_choice_1),
            formatDateTimeKst(user.applicants.interview_choice_2),
            formatDateTimeKst(user.applicants.interview_choice_3),
        ]);
    }, [
        user?.applicants?.interview_choice_1,
        user?.applicants?.interview_choice_2,
        user?.applicants?.interview_choice_3,
    ]);

    useEffect(() => {
        if (members.length === 0) return;
        const next: Record<string, string> = {};
        members.forEach((item) => {
            if (!item.applicants) return;
            next[item.id] = formatDateTimeKst(item.applicants.interview_at);
        });
        setAdminInterviewTimes(next);
    }, [members]);

    const getClassLabel = (value: boolean | null | undefined) => {
        if (value === true) return '임원진';
        if (value === false) return '회원';
        return '-';
    };

    const getSexLabel = (value: string | null) => {
        if (value === 'male') return '남';
        if (value === 'female') return '여';
        return '-';
    };

    function formatDateTimeKst(value?: string | null) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().slice(0, 16);
    }

    function formatKstLabel(value?: string | null) {
        const formatted = formatDateTimeKst(value);
        return formatted ? formatted.replace("T", " ") : "-";
    }

    function parseKstInput(value: string) {
        if (!value) return null;
        const date = new Date(`${value}:00+09:00`);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString();
    }

    const normalizeApplicantStatus = (value: string | null) => {
        if (!value) return null;
        const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
        if (normalized === "submitted" || normalized === "apply_submitted" || normalized === "application_submitted") {
            return "submitted";
        }
        if (normalized === "doc_pass" || normalized === "doc_passed" || normalized === "document_passed") {
            return "doc_passed";
        }
        if (normalized === "interview_done" || normalized === "interview_completed") {
            return "interview_done";
        }
        if (normalized === "interview_scheduled" || normalized === "interview_schedule") {
            return "interview_scheduled";
        }
        if (normalized === "interview") {
            return "interview";
        }
        if (normalized === "final_pass" || normalized === "final_passed") {
            return "final_passed";
        }
        if (normalized === "rejected" || normalized === "reject" || normalized === "failed") {
            return "rejected";
        }
        return normalized;
    };

    const deriveApplicantStatus = (applicant: ApplicantInfo) => {
        if (applicant.rejected_at) return "rejected";
        if (applicant.final_passed_at) return "final_passed";
        if (applicant.interview_at) return "interview_scheduled";
        if (applicant.doc_passed_at) return "doc_passed";
        if (applicant.application_submitted_at) return "submitted";
        return null;
    };

    const getApplicantProgress = (applicant: ApplicantInfo | null): ApplicantProgress | null => {
        if (!applicant) return null;
        const normalized = normalizeApplicantStatus(applicant.status);
        const status = normalized ?? deriveApplicantStatus(applicant);
        if (status === "submitted") {
            return {
                statusLabel: "서류 제출 완료",
                nextLabel: "서류 심사 중",
                message: "심사 완료 후 개별 연락드립니다.",
            };
        }
        if (status === "doc_passed") {
            return {
                statusLabel: "서류 합격",
                nextLabel: "면접 일정 조율",
                message: "가능한 면접 일정을 선택해주세요.",
            };
        }
        if (status === "interview_scheduled") {
            return {
                statusLabel: "면접 일정 확정",
                nextLabel: "면접 진행 예정",
                message: "면접 일정은 개별 안내드렸습니다.",
            };
        }
        if (status === "interview" || status === "interview_done") {
            return {
                statusLabel: status === "interview_done" ? "면접 완료" : "면접 진행",
                nextLabel: "최종 심사 중",
                message: "최종 심사 후 결과를 안내드립니다.",
            };
        }
        if (status === "final_passed") {
            return {
                statusLabel: "최종 합격",
                nextLabel: "가입 안내",
                message: "가입 절차를 안내드릴 예정입니다.",
            };
        }
        if (status === "rejected") {
            return {
                statusLabel: "불합격",
                nextLabel: "-",
                message: "문의가 필요하시면 연락주세요.",
            };
        }
        return {
            statusLabel: applicant.status ?? "-",
            nextLabel: "-",
            message: "상태 확인 중입니다.",
        };
    };

    const filteredMembers = members.filter((item) => {
        const matchQuery =
            memberQuery.trim().length === 0 ||
            item.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(memberQuery.toLowerCase());

        const isExternal = !item.members;
        const isApplicant = Boolean(item.applicants?.status);

        const matchClass =
            memberFilter === "all" ||
            (memberFilter === "임원진" && item.members?.president === true) ||
            (memberFilter === "회원" && item.members?.president === false) ||
            (memberFilter === "외부인" && isExternal) ||
            (memberFilter === "입회 희망자" && isApplicant);

        return matchQuery && matchClass;
    });

    const filteredApplicants = members.filter((item) => {
        const matchQuery =
            memberQuery.trim().length === 0 ||
            item.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(memberQuery.toLowerCase());
        const isApplicant = Boolean(item.applicants?.status);
        const isMember = Boolean(item.members);
        return matchQuery && isApplicant && !isMember;
    });

    const applicantStatusOptions = [
        { value: "submitted", label: "서류 제출" },
        { value: "doc_pass", label: "서류 합격" },
        { value: "interview_scheduled", label: "면접 일정 확정" },
        { value: "interview_done", label: "면접 완료" },
        { value: "final_pass", label: "최종 합격" },
        { value: "rejected", label: "불합격" },
    ];

    const getApplicantStatusValue = (status: string | null) => {
        const normalized = normalizeApplicantStatus(status);
        if (normalized === "doc_passed") return "doc_pass";
        if (normalized === "final_passed") return "final_pass";
        if (normalized === "interview_scheduled") return "interview_scheduled";
        if (normalized === "interview_done") return "interview_done";
        if (normalized === "rejected") return "rejected";
        return "submitted";
    };

    const getMemberRole = (item: User): MemberRole => {
        if (!item.members) return "external";
        return item.members.president === true ? "president" : "member";
    };

    const updateMember = async (payload: {
        id: string;
        president?: boolean;
        org?: string | null;
        applicantStatus?: string;
    }) => {
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
            return { ok: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
            return { ok: false, error: message };
        }
    };

    const removeMember = async (id: string) => {
        setAdminError(null);
        try {
            const res = await fetch(`/api/admin/members?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to remove member');
            await loadAdminData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setAdminError(message);
        }
    };

    const handleRoleChange = async (id: string, nextRole: MemberRole, currentOrg: string | null) => {
        if (nextRole === "external") {
            if (!confirm("외부인으로 변경하면 회원 정보가 삭제됩니다. 진행할까요?")) {
                setMembers((prev) => [...prev]);
                return;
            }
            await removeMember(id);
            return;
        }

        if (nextRole === "member" && !currentOrg) {
            alert("부서를 먼저 지정해주세요.");
            setMembers((prev) => [...prev]);
            return;
        }

        await updateMember({ id, president: nextRole === "president" });
    };

    const submitInterviewChoices = async () => {
        if (interviewSubmitting) return;
        setInterviewFeedback(null);
        const trimmed = interviewChoices.map((value) => value.trim());
        if (!trimmed[0]) {
            setInterviewFeedback("면접 1순위는 필수입니다.");
            return;
        }
        const provided = trimmed.filter((value) => value);
        const unique = new Set(provided);
        if (unique.size !== provided.length) {
            setInterviewFeedback("서로 다른 시간을 선택해주세요.");
            return;
        }
        const parsedChoices = trimmed.map((value) => (value ? parseKstInput(value) : null));
        if (parsedChoices.some((value, index) => trimmed[index] && !value)) {
            setInterviewFeedback("시간 형식이 올바르지 않습니다.");
            return;
        }
        setInterviewSubmitting(true);
        try {
            const res = await fetch('/api/mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: "interview", choices: parsedChoices }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? '면접 일정 전송에 실패했습니다.');
            setInterviewFeedback("일정이 전송되었습니다.");
            await loadMember();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setInterviewFeedback(message);
        } finally {
            setInterviewSubmitting(false);
        }
    };

    const sendInterviewNotice = async (userId: string, interviewValue: string) => {
        if (noticeSendingId) return;
        if (!interviewValue) {
            setNoticeFeedback((prev) => ({ ...prev, [userId]: "면접 시간을 입력해주세요." }));
            return;
        }
        const parsed = parseKstInput(interviewValue);
        if (!parsed) {
            setNoticeFeedback((prev) => ({ ...prev, [userId]: "시간 형식이 올바르지 않습니다." }));
            return;
        }
        setNoticeSendingId(userId);
        setNoticeFeedback((prev) => ({ ...prev, [userId]: "" }));
        try {
            const res = await fetch('/api/mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: "interview_notice", userId, interviewAt: parsed }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? '메일 발송에 실패했습니다.');
            setNoticeFeedback((prev) => ({ ...prev, [userId]: "발송 완료" }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setNoticeFeedback((prev) => ({ ...prev, [userId]: message }));
        } finally {
            setNoticeSendingId(null);
        }
    };

    // 저장 기능 제거

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
            window.dispatchEvent(new Event('orgs:updated'));
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
            window.dispatchEvent(new Event('orgs:updated'));
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

    const isExternalUser = Boolean(user && !user.members);
    const applicantStatus = isExternalUser && user?.applicants
        ? normalizeApplicantStatus(user.applicants.status) ?? deriveApplicantStatus(user.applicants)
        : null;

    const applicantProgress = isExternalUser ? getApplicantProgress(user?.applicants ?? null) : null;

    return(
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>마이페이지</h1>
                {error && <p className={styles.error}>{error}</p>}
                {loading && <p className={styles.helper}>처리 중...</p>}
                {user ? (
                    <div className={styles.infoGrid}>
                        <div className={styles.infoName}>
                            <p className={styles.label}>이름</p>
                            <p className={styles.value}>{user.name}</p>
                        </div>
                        <div className={styles.infoEmail}>
                            <p className={styles.label}>이메일</p>
                            <p className={styles.value}>{user.email}</p>
                        </div>
                        <div className={styles.infoBirth}>
                            <p className={styles.label}>생일</p>
                            <p className={styles.value}>{user.birth ?? '-'}</p>
                        </div>
                        <div className={styles.infoSex}>
                            <p className={styles.label}>성별</p>
                            <p className={styles.value}>{getSexLabel(user.sex)}</p>
                        </div>
                        <div className={styles.infoSchool}>
                            <p className={styles.label}>학교</p>
                            <p className={styles.value}>{user.school ?? '-'}</p>
                        </div>
                        <div className={styles.infoDept}>
                            <p className={styles.label}>소속</p>
                            <p className={styles.value}>{user.members?.org ?? '-'}</p>
                        </div>
                        <div className={styles.infoClass}>
                                <p className={styles.label}>등급</p>
                                <p className={styles.value}>
                                {getClassLabel(user.members?.president)}
                                </p>
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
            <ApplicantSection
                applicantProgress={applicantProgress}
                applicantStatus={applicantStatus}
                applicants={user?.applicants ?? null}
                interviewChoices={interviewChoices}
                setInterviewChoices={setInterviewChoices}
                interviewSubmitting={interviewSubmitting}
                interviewFeedback={interviewFeedback}
                onSubmitInterviewChoices={submitInterviewChoices}
            />
            {user?.members?.president === true && (
                <AdminSection
                    adminError={adminError}
                    memberFilter={memberFilter}
                    setMemberFilter={setMemberFilter}
                    memberQuery={memberQuery}
                    setMemberQuery={setMemberQuery}
                    memberPage={memberPage}
                    setMemberPage={setMemberPage}
                    applicantPage={applicantPage}
                    setApplicantPage={setApplicantPage}
                    pageSize={pageSize}
                    filteredMembers={filteredMembers}
                    filteredApplicants={filteredApplicants}
                    getMemberRole={getMemberRole}
                    handleRoleChange={handleRoleChange}
                    updateMember={updateMember}
                    orgs={orgs}
                    orgForm={orgForm}
                    setOrgForm={setOrgForm}
                    createOrg={createOrg}
                    deleteOrg={deleteOrg}
                    applicantStatusOptions={applicantStatusOptions}
                    getApplicantStatusValue={getApplicantStatusValue}
                    formatKstLabel={formatKstLabel}
                    formatDateTimeKst={formatDateTimeKst}
                    adminInterviewTimes={adminInterviewTimes}
                    setAdminInterviewTimes={setAdminInterviewTimes}
                    sendInterviewNotice={sendInterviewNotice}
                    noticeSendingId={noticeSendingId}
                    noticeFeedback={noticeFeedback}
                />
            )}
        </div>
    )
}
