import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "10");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("forum_posts")
    .select("id, title, content, author_name, category, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posts: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!title || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("user")
    .select("name, members(president)")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const authorName = member?.name ?? session.user?.name ?? email;

  const category = typeof body?.category === "string" ? body.category.trim() : "";
  if (!category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isMember = Boolean(member.members);
  if (!isMember) {
    if (category !== "자유") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_email", email)
      .eq("category", "자유")
      .gte("created_at", since);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "Daily limit reached" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("forum_posts").insert({
    title,
    content,
    author_email: email,
    author_name: authorName,
    category,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
