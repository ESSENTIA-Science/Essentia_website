"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./page.module.css";

type Post = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
  created_at: string;
};

type Member = {
  members: { president: boolean | null } | null;
};

export default function ForumPage() {
  const { status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [form, setForm] = useState({ title: "", category: "자유", content: "" });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = ["공지", "자유", "ICAROS", "Obvium Nihil"];
  const canWrite = Boolean(member);
  const isRestrictedWriter = !member?.members;
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadPosts = async (pageToLoad = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      params.set("page", pageToLoad.toString());
      params.set("pageSize", pageSize.toString());
      params.set("ts", Date.now().toString());
      const res = await fetch(`/api/forum?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load posts");
      setPosts(data.posts ?? []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setPage(typeof data.page === "number" && data.page > 0 ? data.page : pageToLoad);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadMember = async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch(`/api/me?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      setMember(data.member ?? null);
    } catch {
      setMember(null);
    }
  };

  useEffect(() => {
    setPage(1);
    loadPosts(1);
  }, [activeCategory]);

  useEffect(() => {
    loadMember();
  }, [status]);

  useEffect(() => {
    if (isRestrictedWriter) {
      setForm((prev) => ({ ...prev, category: "자유" }));
    }
  }, [isRestrictedWriter]);

  useEffect(() => {
    if (error === "Daily limit reached") {
      alert("하루 글 작성 횟수(3회)를 초과했습니다.");
    }
  }, [error]);

  const insertMarkdownImage = (url: string, altText: string) => {
    const markdown = `![${altText}](${url})`;
    const textarea = textareaRef.current;

    if (!textarea) {
      setForm((prev) => ({
        ...prev,
        content: prev.content ? `${prev.content}\n${markdown}` : markdown,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
    const snippet = `${prefix}${markdown}${suffix}`;
    const next = `${before}${snippet}${after}`;
    const cursor = before.length + snippet.length;

    setForm((prev) => ({ ...prev, content: next }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleImageButtonClick = () => {
    if (isImageUploading) return;
    fileInputRef.current?.click();
  };

  const loadImageElement = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to read image"));
      };

      image.src = objectUrl;
    });

  const resizeImageForUpload = async (file: File) => {
    const resizableMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!resizableMimeTypes.has(file.type)) {
      return file;
    }

    const image = await loadImageElement(file);
    const editorWidth = textareaRef.current?.clientWidth ?? 720;
    const maxWidth = Math.max(1, Math.floor(editorWidth * 0.5));

    if (image.naturalWidth <= maxWidth) {
      return file;
    }

    const scale = maxWidth / image.naturalWidth;
    const targetWidth = maxWidth;
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (!value) {
            reject(new Error("Failed to resize image"));
            return;
          }
          resolve(value);
        },
        file.type,
        file.type === "image/png" ? undefined : 0.9
      );
    });

    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsImageUploading(true);

    try {
      const uploadFile = await resizeImageForUpload(file);
      const payload = new FormData();
      payload.append("file", uploadFile);

      const res = await fetch("/api/forum/upload", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();

      if (!res.ok || typeof data?.url !== "string") {
        throw new Error(data?.error ?? "Failed to upload image");
      }

      const altText = file.name.replace(/\.[^.]+$/, "").trim() || "image";
      insertMarkdownImage(data.url, altText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      event.target.value = "";
      setIsImageUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create post");
      setForm({ title: "", category: "자유", content: "" });
      setShowForm(false);
      await loadPosts(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyFormat = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = form.content.slice(0, start);
    const selection = form.content.slice(start, end);
    const after = form.content.slice(end);

    const setContent = (next: string, cursorStart: number, cursorEnd: number) => {
      setForm((prev) => ({ ...prev, content: next }));
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    };

    if (type.startsWith("h")) {
      const level = type.replace("h", "");
      const lineStart = before.lastIndexOf("\n") + 1;
      const prefix = "#".repeat(Number(level)) + " ";
      const next = before.slice(0, lineStart) + prefix + before.slice(lineStart) + after;
      const cursor = end + prefix.length;
      setContent(next, cursor, cursor);
      return;
    }

    if (type === "bold") {
      const wrapper = "**";
      const next = before + wrapper + selection + wrapper + after;
      setContent(next, start + wrapper.length, end + wrapper.length);
      return;
    }

    if (type === "italic") {
      const wrapper = "*";
      const next = before + wrapper + selection + wrapper + after;
      setContent(next, start + wrapper.length, end + wrapper.length);
      return;
    }

    if (type === "bullet") {
      const lineStart = before.lastIndexOf("\n") + 1;
      const prefix = "- ";
      const next = before.slice(0, lineStart) + prefix + before.slice(lineStart) + after;
      const cursor = end + prefix.length;
      setContent(next, cursor, cursor);
      return;
    }

    if (type === "quote") {
      const lineStart = before.lastIndexOf("\n") + 1;
      const prefix = "> ";
      const next = before.slice(0, lineStart) + prefix + before.slice(lineStart) + after;
      const cursor = end + prefix.length;
      setContent(next, cursor, cursor);
      return;
    }

    if (type === "link") {
      const label = selection || "링크 텍스트";
      const template = `[${label}](https://)`;
      const next = before + template + after;
      const cursorStart = start + label.length + 3;
      const cursorEnd = cursorStart + 8;
      setContent(next, cursorStart, cursorEnd);
      return;
    }

    if (type === "image") {
      const label = selection || "이미지 설명";
      const template = `![${label}](https://)`;
      const next = before + template + after;
      const cursorStart = start + label.length + 4;
      const cursorEnd = cursorStart + 8;
      setContent(next, cursorStart, cursorEnd);
      return;
    }

    if (type === "code") {
      const wrapper = "```\n";
      const suffix = "\n```";
      const content = selection || "코드를 입력하세요";
      const next = before + wrapper + content + suffix + after;
      const cursorStart = start + wrapper.length;
      const cursorEnd = cursorStart + content.length;
      setContent(next, cursorStart, cursorEnd);
    }
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === page) return;
    setPage(safePage);
    loadPosts(safePage);
  };

  const noticeCategory = "공지";
  const displayPosts =
    activeCategory === "all"
      ? [...posts].sort((a, b) => {
          const aNotice = a.category === noticeCategory;
          const bNotice = b.category === noticeCategory;
          if (aNotice && !bNotice) return -1;
          if (!aNotice && bNotice) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      : posts;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>게시판</h1>
        {canWrite && (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "작성 취소" : "글 작성하기"}
          </button>
        )}
      </div>

      {canWrite && showForm && (
        <div className={styles.writeSection}>
          <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <input
                  className={styles.input}
                  placeholder="제목"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              <select
                className={styles.select}
                value={isRestrictedWriter ? "자유" : form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                disabled={isRestrictedWriter}
              >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.toolbar}>
                <button type="button" onClick={() => applyFormat("h1")}>H1</button>
                <button type="button" onClick={() => applyFormat("h2")}>H2</button>
                <button type="button" onClick={() => applyFormat("h3")}>H3</button>
                <button type="button" onClick={() => applyFormat("h4")}>H4</button>
                <span className={styles.divider} />
                <button type="button" onClick={() => applyFormat("bold")}><strong>B</strong></button>
                <button type="button" onClick={() => applyFormat("italic")}><em>I</em></button>
                <button type="button" onClick={() => applyFormat("bullet")}>-</button>
                <button type="button" onClick={() => applyFormat("link")}>Link</button>
                <button type="button" onClick={handleImageButtonClick} disabled={isImageUploading}>
                  {isImageUploading ? "Uploading..." : "Img"}
                </button>
                <button type="button" onClick={() => applyFormat("code")}>{"</>"}</button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleImageFileChange}
                className={styles.hiddenFileInput}
              />
              <textarea
                className={styles.textarea}
                placeholder="본문 (Markdown 지원)"
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                ref={textareaRef}
                required
              />
              <div className={styles.formBtnRow}>
                <button className={styles.primaryButton} type="submit" disabled={isSubmitting || isImageUploading}>
                  등록
                </button>
                <p>부적절한 게시글 작성 시 삭제조치 될 수도 있습니다.</p>
              </div>
          </form>
        </div>
      )}

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterButton} ${activeCategory === "all" ? styles.filterActive : ""}`}
          type="button"
          onClick={() => setActiveCategory("all")}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`${styles.filterButton} ${activeCategory === category ? styles.filterActive : ""}`}
            type="button"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              이전
            </button>
            <span className={styles.pageInfo}>{page} / {totalPages}</span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              다음
            </button>
          </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.helper}>Loading...</p>
      ) : (
        <div className={styles.listSection}>
          <div className={styles.list}>
          {displayPosts.map((post) => (
            <Link
              key={post.id}
              href={`/forum/${post.id}`}
              className={`${styles.card} ${post.category === noticeCategory ? styles.noticeCard : ""}`}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                <span className={styles.meta}>
                  {post.category} · {post.author_name ?? "익명"} · {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
