import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const getAdminSession = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) return { admin: false };

  const { data: member } = await supabase
    .from("members")
    .select("class")
    .eq("email", email)
    .maybeSingle();
  const memberClass = member?.class ?? null;
  const admin = memberClass === 0 || memberClass === 1;
  return { admin };
};

export async function GET() {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, parent_id, depth")
    .order("depth")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organizations: data ?? [] });
}

export async function POST(request: Request) {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const parentId = typeof body?.parent_id === "string" ? body.parent_id : null;
  const depth = typeof body?.depth === "number" ? body.depth : null;

  if (!name || depth === null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("organizations").insert({
    name,
    parent_id: parentId,
    depth,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const parentId = typeof body?.parent_id === "string" ? body.parent_id : null;
  const depth = typeof body?.depth === "number" ? body.depth : null;

  if (!id || !name || depth === null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name, parent_id: parentId, depth })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (org?.name) {
    await supabase.from("members").update({ depth_1: null }).eq("depth_1", org.name);
  }

  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
