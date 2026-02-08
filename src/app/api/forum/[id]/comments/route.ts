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
    .from("forum_comments")
    .select("id, content, author_name, author_email, created_at")
    .eq("post_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let canEditAll = false;
  if (email) {
    const { data: member } = await supabase
      .from("user")
      .select("members(president)")
      .eq("email", email)
      .maybeSingle();
      // @ts-ignore
    canEditAll = member?.members?.president === true;
  }

  const comments = (data ?? []).map((item) => {
    const canEdit = canEditAll || (email ? item.author_email === email : false);
    const { author_email: _authorEmail, ...rest } = item;
    return { ...rest, canEdit };
  });

  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("user")
    .select("name")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const authorName = member?.name ?? session.user?.name ?? email;

  const { error } = await supabase.from("forum_comments").insert({
    post_id: params.id,
    content,
    author_email: email,
    author_name: authorName,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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

  const body = await request.json();
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: comment, error: commentError } = await supabase
    .from("forum_comments")
    .select("author_email")
    .eq("id", params.id)
    .maybeSingle();

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 500 });
  }

  const { data: member, error: memberError } = await supabase
    .from("user")
    .select("members(president)")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const canEdit =
  // @ts-ignore
    member?.members?.president === true ||
    (comment?.author_email && comment.author_email === email);

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("forum_comments")
    .update({ content })
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

  const { data: comment, error: commentError } = await supabase
    .from("forum_comments")
    .select("author_email")
    .eq("id", params.id)
    .maybeSingle();

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 500 });
  }

  const { data: member, error: memberError } = await supabase
    .from("user")
    .select("members(president)")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const canDelete =
  // @ts-ignore
    member?.members?.president === true ||
    (comment?.author_email && comment.author_email === email);

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("forum_comments")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
