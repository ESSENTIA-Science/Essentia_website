"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import icarosImage from "@/app/asset/icaros.png";
import obviumImage from "@/app/asset/Obvium Nihil.jpg";

const projects = [
  {
    slug: "icaros",
    title: "ICAROS",
    description: "ICAROS는 고체추진 로켓을 제작하며 기술 개발과 발사 적용을 목표로 하는 항공우주 프로젝트입니다. 모델로켓, 캔위성 등 심도 있는 실험과 시스템 개발을 집중적으로 수행합니다",
    href: "https://icaros.kr",
    external: true,
    image: icarosImage,
  },
  {
    slug: "obvium-nihil",
    title: "Obvium Nihil",
    description: "ESSENTIA Science에 속한 연구팀으로, 모든 연구 내용은 공식적인 개제 전까진 공개되지 않습니다",
    href: "/projects/obvium-nihil",
    external: false,
    image: obviumImage,
  },
];

export default function ProjectsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>프로젝트</h1>
        <p className={styles.subtitle}>
          ESSENTIA 과학회에서 진행/완료된 프로젝트들 입니다.
        </p>
      </header>
      <div className={styles.grid}>
        {projects.map((project) =>
          project.external ? (
            <a
              key={project.slug}
              href={project.href}
              className={`${styles.card} ${styles.cardFade}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{project.title}</h2>
                <span className={styles.cardTag}>진행 중</span>
              </div>
              <p className={styles.cardDesc}>{project.description}</p>
              <Image
                className={styles.cardImage}
                src={project.image}
                alt={`${project.title} cover`}
                width={240}
                height={170}
              />
            </a>
          ) : (
            <Link
              key={project.slug}
              href={project.href}
              className={`${styles.card} ${styles.cardFade}`}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{project.title}</h2>
                <span className={styles.cardTag}>진행 중</span>
              </div>
              <p className={styles.cardDesc}>{project.description}</p>
              <Image
                className={styles.cardImage}
                src={project.image}
                alt={`${project.title} cover`}
                width={240}
                height={170}
              />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
