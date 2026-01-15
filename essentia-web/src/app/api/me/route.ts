import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const getSessionUser = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const provider = (session?.user as { provider?: string } | undefined)?.provider ?? null;
  return { session, email, provider };
};

export async function GET() {
  const { session, email, provider } = await getSessionUser();
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, provider, birth, sex, school, class, subClass, depth_1, depth_2, depth_3, member_code, application_submitted_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && (!data.provider || data.provider.length === 0) && provider) {
    await supabase
      .from("members")
      .update({ provider })
      .eq("email", email);
  }

  return NextResponse.json({ member: data ?? null });
}

export async function POST(request: Request) {
  const { session, email, provider } = await getSessionUser();
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const birth = typeof body?.birth === "string" ? body.birth.trim() : "";
  const sex = typeof body?.sex === "string" ? body.sex.trim() : "";

  if (!name || !birth || !sex) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from("members")
    .select("id, provider")
    .eq("email", email)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (existing) {
    if (!existing.provider && provider) {
      const { error: updateError } = await supabase
        .from("members")
        .update({ provider })
        .eq("email", email);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const { error: insertError } = await supabase.from("members").insert({
    name,
    email,
    birth,
    sex,
    provider,
    class: 4,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
