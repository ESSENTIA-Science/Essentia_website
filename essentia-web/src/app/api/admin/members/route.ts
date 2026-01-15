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
  if (!session || !email) return { session: null, email: null, admin: false };

  const { data: member } = await supabase
    .from("members")
    .select("class")
    .eq("email", email)
    .maybeSingle();
  const memberClass = member?.class ?? null;
  const admin = memberClass === 0 || memberClass === 1;
  return { session, email, admin };
};

const getNextMemberCode = async (prefix: number) => {
  const { data } = await supabase
    .from("members")
    .select("member_code")
    .like("member_code", `${prefix}%`)
    .order("member_code", { ascending: false })
    .limit(1);

  const latest = data?.[0]?.member_code ?? null;
  if (!latest || isNaN(Number(latest))) {
    return `${prefix}0001`;
  }

  return String(Number(latest) + 1);
};

export async function GET() {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, class, provider, depth_1, member_code")
    .order("class")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}

export async function PATCH(request: Request) {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const nextClass = typeof body?.class === "number" ? body.class : null;
  const depth1 = typeof body?.depth_1 === "string" ? body.depth_1.trim() : null;

  if (!id) {
    return NextResponse.json({ error: "Missing member id" }, { status: 400 });
  }

  if (nextClass === 0) {
    return NextResponse.json({ error: "Class 0 is not allowed" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("class, member_code")
    .eq("id", id)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof nextClass === "number") {
    updates.class = nextClass;
    if (nextClass === 1) {
      const hasPrefix = typeof member.member_code === "string" && member.member_code.startsWith("1");
      if (!hasPrefix) {
        updates.member_code = await getNextMemberCode(1);
      }
    }
    if (nextClass === 2) {
      const hasPrefix = typeof member.member_code === "string" && member.member_code.startsWith("2");
      if (!hasPrefix) {
        updates.member_code = await getNextMemberCode(2);
      }
    }
    if (nextClass === 3 || nextClass === 4) {
      updates.member_code = null;
    }
  }

  if (depth1 !== null) {
    if (member.class !== null && member.class <= 2) {
      updates.depth_1 = depth1.length > 0 ? depth1 : null;
    } else {
      return NextResponse.json({ error: "Department change not allowed" }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("members").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
