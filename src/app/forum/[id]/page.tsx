"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./page.module.css";

type Post = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
  created_at: string;
};

type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
  canEdit?: boolean;
};

export default function ForumDetailPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", category: "자유", content: "" });
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const categories = ["자유", "공지", "ICAROS", "Obvium Nihil"];

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/forum/${params.id}?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load post");
      setPost(data.post ?? null);
      setCanEdit(Boolean(data.canEdit));
      setCanDelete(Boolean(data.canDelete));
      if (data.post) {
        setEditForm({
          title: data.post.title,
          category: data.post.category,
          content: data.post.content,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/forum/${params.id}/comments?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load comments");
      setComments(data.comments ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  };

  useEffect(() => {
    loadPost();
    loadComments();
  }, [params.id]);

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCommentSubmitting) return;
    setError(null);
    setIsCommentSubmitting(true);
    try {
      const res = await fetch(`/api/forum/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save comment");
      setComment("");
      await loadComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleCommentEdit = (item: Comment) => {
    setEditingCommentId(item.id);
    setEditingCommentValue(item.content);
  };

  const handleCommentUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCommentId) return;
    setError(null);
    try {
      const res = await fetch(`/api/forum/${editingCommentId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCommentValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update comment");
      setEditingCommentId(null);
      setEditingCommentValue("");
      await loadComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/forum/${commentId}/comments`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete comment");
      await loadComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch(`/api/forum/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update post");
      setEditing(false);
      await loadPost();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("삭제하시겠습니까?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/forum/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete post");
      window.location.href = "/forum";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <Link href="/forum" className={styles.back}>
        ← 목록으로
      </Link>

      {loading ? (
        <p className={styles.helper}>로딩중...</p>
      ) : post ? (
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.meta}>
              {post.category} · {post.author_name ?? "익명"} · {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
          {(canEdit || canDelete) && (
            <div className={styles.actions}>
              {canEdit && (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setEditing((prev) => !prev)}
                >
                  {editing ? "취소" : "수정"}
                </button>
              )}
              {canDelete && (
                <button className={styles.dangerButton} type="button" onClick={handleDelete}>
                  삭제
                </button>
              )}
            </div>
          )}
          {editing ? (
            <form className={styles.editForm} onSubmit={handleUpdate}>
              <div className={styles.formRow}>
                <input
                  className={styles.input}
                  value={editForm.title}
                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                  required
                />
                <select
                  className={styles.select}
                  value={editForm.category}
                  onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className={styles.textarea}
                value={editForm.content}
                onChange={(event) => setEditForm({ ...editForm, content: event.target.value })}
                required
              />
              <button className={styles.primaryButton} type="submit">
                저장
              </button>
            </form>
          ) : (
            <div className={styles.content}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.helper}>게시글을 찾을 수 없습니다.</p>
      )}

      <div className={styles.commentSection}>
        <h2 className={styles.sectionTitle}>댓글</h2>
        {comments.length === 0 && <p className={styles.helper}>첫 댓글을 남겨보세요.</p>}
        <div className={styles.commentList}>
          {comments.map((item) => (
            <div key={item.id} className={styles.commentCard}>
              <p className={styles.commentMeta}>
                {item.author_name ?? "익명"} · {new Date(item.created_at).toLocaleString()}
              </p>
              {editingCommentId === item.id ? (
                <form className={styles.commentEditForm} onSubmit={handleCommentUpdate}>
                  <textarea
                    className={styles.textarea}
                    value={editingCommentValue}
                    onChange={(event) => setEditingCommentValue(event.target.value)}
                    required
                  />
                  <div className={styles.commentActions}>
                    <button className={styles.primaryButton} type="submit">
                      저장
                    </button>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditingCommentValue("");
                      }}
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <p className={styles.commentBody}>{item.content}</p>
              )}
              {item.canEdit && editingCommentId !== item.id && (
                <div className={styles.commentActions}>
                  <button className={styles.secondaryButton} type="button" onClick={() => handleCommentEdit(item)}>
                    수정
                  </button>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={() => handleCommentDelete(item.id)}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {status === "authenticated" && (
          <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
            <textarea
              className={styles.textarea}
              placeholder="댓글을 입력하세요"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
            />
            <button className={styles.primaryButton} type="submit" disabled={isCommentSubmitting}>
              댓글 작성
            </button>
          </form>
        )}
        {status !== "authenticated" && (
          <p className={styles.helper}>댓글 작성은 로그인 후 가능합니다.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
