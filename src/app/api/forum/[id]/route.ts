import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  const { data, error } = await supabase
    .from("forum_posts")
    .select("id, title, content, author_name, author_email, category, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ post: null, canEdit: false });
  }

  let canEdit = false;
  let canDelete = false;
  if (email) {
    if (data.author_email === email) {
      canEdit = true;
    }
    const { data: member } = await supabase
      .from("user")
      .select("members(president)")
      .eq("email", email)
      .maybeSingle();
      // @ts-ignore
    const isAdmin = member?.members?.president === true;
    const isMember = Boolean(member?.members);
    if (isAdmin || (isMember && data.author_email === email)) {
      canDelete = true;
    }
  }

  const { author_email: _authorEmail, ...safePost } = data;
  return NextResponse.json({ post: safePost, canEdit, canDelete });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: post, error: postError } = await supabase
    .from("forum_posts")
    .select("author_email")
    .eq("id", params.id)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  const canEdit = post?.author_email === email;

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!title || !content || !category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("forum_posts")
    .update({ title, content, category })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: post, error: postError } = await supabase
    .from("forum_posts")
    .select("author_email")
    .eq("id", params.id)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  const { data: member, error: memberError } = await supabase
    .from("user")
    .select("members(president)")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
// @ts-ignore
  const isAdmin = member?.members?.president === true;
  const isMember = Boolean(member?.members);
  const canDelete = isAdmin || (isMember && post?.author_email === email);

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
