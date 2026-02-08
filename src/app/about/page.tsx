'use client';

import styles from "./page.module.css";
import OrganizationSection from '@/components/organization/OrganizationSection';

export default function About() {
    return(
        <div className={styles.page}>
            <div className={styles.aboutContent}>
                <section className={styles.intro}>
                    <div className={styles.introBlock}>
                        <h2 className={styles.introTitle}>Vision</h2>
                        <p className={styles.introText}>
                            현재의 교육 체계는 표준화된 평가에 최적화되어 있습니다. 그러나 진정한 과학적 재능은 시험지 위에서만 빛나지 않습니다. ESSENTIA는 기존 교육 과정이 제대로 평가하지 못하는 과학 인재들을 위해 2025년 7월 20일 창립되었습니다.
                        </p>
                    </div>
                    <div className={styles.introBlock}>
                        <h2 className={styles.introTitle}>Goal</h2>
                        <p className={styles.introText}>
                            학교라는 제한된 환경에서는 경험하기 어려운 더 많고 다양한 과학 활동을 제공합니다. 깊이 있는 탐구 프로젝트, 동료 연구자들과의 교류, 실질적인 연구 경험 등을 통해 학생들이 자신의 과학적 열정을 마음껏 펼칠 수 있도록 돕습니다.
                        </p>
                    </div>
                    <div className={styles.introBlock}>
                        <h2 className={styles.introTitle}>Mission</h2>
                        <h3 className={styles.introHeading}>공인 과학회를 향하여</h3>
                        <p className={styles.introText}>
                            단순한 동아리를 넘어, 법률 전담 부서를 통해 공식적으로 인정받는 과학 교육 기관으로 나아가고 있습니다. 우리의 활동이 더 많은 학생들에게 지속가능하게 제공될 수 있도록 제도적 기반을 다지고 있습니다.
                        </p>
                        <h3 className={styles.introHeading}>재정 장벽 없는 과학 활동</h3>
                        <p className={styles.introText}>
                            후원을 통해 모든 인재가 재정 상황에 구애받지 않고 과학 활동에 전념할 수 있도록 노력합니다. 경제적 배경이 아닌 열정과 재능이 기회를 결정해야 한다고 믿습니다.
                        </p>
                        <h3 className={styles.introHeading}>과학계의 미래를 만드는 인재</h3>
                        <p className={styles.introText}>
                            우리의 궁극적인 목표는 단순합니다. 현재 ESSENTIA에서 활동하는 학생들이 사회로 나가 진심으로 수학과 과학에 전념하는 인재가 되어, 과학계에 이로운 영향을 미치는 것입니다.
                        </p>
                    </div>
                    <div className={styles.introBlock}>
                        <h2 className={styles.introTitle}>Grow</h2>
                        <p className={styles.introText}>
                            ESSENTIA는 아직 완성된 조직이 아닙니다. 우리는 함께 성장하고, 함께 실험하며, 함께 더 나은 과학 교육의 모습을 그려나가고 있습니다. 당신의 열정이 이 여정의 일부가 되길 기다립니다.
                        </p>
                    </div>
                    <div className={styles.introBlock} id='org'>
                        <h2 className={styles.introTitle}>조직도</h2>
                        <p className={styles.introText}>
                            현재 ESSENTIA 과학회의 조직도 입니다. 원하는 부서에 입회 가능하며, 원한다면 새로운 부서를 신설 할 수도 있습니다.
                        </p>
                    </div>
                </section>
                <section className={styles.organization}>
                <div className={styles.nodeBox}>
                    <OrganizationSection />
                </div>
                </section>
            </div>
        </div>

    )
}
