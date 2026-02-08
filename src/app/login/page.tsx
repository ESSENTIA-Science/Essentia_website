'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from "./page.module.css";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { VscGithub } from "react-icons/vsc";

export default function Login() {
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (provider: string) => {
        try {
            setError(null);
            setLoadingProvider(provider);
            if (provider === 'google') {
                const response = await signIn(provider, {
                    callbackUrl: "/onboarding",
                    redirect: false,
                });
                const signInUrl = response?.url;
                if (signInUrl) {
                    window.open(signInUrl, "_blank");
                }
                setLoadingProvider(null);
                return;
            }
            await signIn(provider, { callbackUrl: "/onboarding" });
        } catch (err) {
            const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
            setError(message);
            setLoadingProvider(null);
        }
    };

    return(
        <div className={styles.page}>
            <div className={styles.card}>
                <p className={styles.eyebrow}>ESSENTIA Science</p>
                <h1 className={styles.title}>로그인</h1>
                <p className={styles.subtitle}>
                    소셜 계정으로 간편하게 로그인하세요.
                </p>
                <div className={styles.buttonGroup}>
                    <button
                        className={`${styles.loginButton} ${styles.google}`}
                        type="button"
                        onClick={() => handleLogin('google')}
                        disabled={loadingProvider !== null}
                    >
                        <FcGoogle/>
                        Google로 계속하기
                    </button>
                    <button
                        className={`${styles.loginButton} ${styles.kakao}`}
                        type="button"
                        onClick={() => handleLogin('kakao')}
                        disabled={loadingProvider !== null}
                    >
                        <RiKakaoTalkFill />
                        Kakao로 계속하기
                    </button>
                    <button
                        className={`${styles.loginButton} ${styles.github}`}
                        type="button"
                        onClick={() => handleLogin('github')}
                        disabled={loadingProvider !== null}
                    >
                        <VscGithub />
                        GitHub로 계속하기
                    </button>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <p className={styles.notice}>
                    로그인 시 서비스 이용약관과 개인정보 처리방침에 동의한 것으로 간주됩니다.
                </p>
            </div>
        </div>
    )
}
