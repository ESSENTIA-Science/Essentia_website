import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const getSessionUser = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  return { session, email };
};

export async function GET() {
  const { session, email } = await getSessionUser();

  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user")
    .select(
      "id,name,email,birth,sex,school,created_at,members(org,member_code,president),applicants(status,application_submitted_at,doc_passed_at,interview_at,final_passed_at,rejected_at,doc_introduction,doc_motive,interview_choice_1,interview_choice_2,interview_choice_3,interview_request_at)"
    )
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = data
    ? {
        ...data,
        members: normalizeSingle(data.members),
        applicants: normalizeSingle(data.applicants),
      }
    : null;

  return NextResponse.json({ member: normalized });
}

export async function POST(request: Request) {
  const { session, email } = await getSessionUser();
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
    .from("user")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("user")
      .update({ name, birth, sex })
      .eq("email", email);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error: insertError } = await supabase.from("user").insert({
    email,
    name,
    birth,
    sex,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
