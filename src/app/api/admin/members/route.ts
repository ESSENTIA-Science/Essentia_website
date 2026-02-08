import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendApplicantStatusNotification } from "@/lib/mail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const normalizeApplicantStatus = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "submitted" || normalized === "apply_submitted" || normalized === "application_submitted") {
    return "submitted";
  }
  if (normalized === "doc_pass" || normalized === "doc_passed" || normalized === "document_passed") {
    return "doc_passed";
  }
  if (normalized === "interview_done" || normalized === "interview_completed") {
    return "interview_done";
  }
  if (normalized === "interview_scheduled" || normalized === "interview_schedule") {
    return "interview_scheduled";
  }
  if (normalized === "interview") {
    return "interview";
  }
  if (normalized === "final_pass" || normalized === "final_passed") {
    return "final_passed";
  }
  if (normalized === "rejected" || normalized === "reject" || normalized === "failed") {
    return "rejected";
  }
  return normalized;
};

const toDbApplicantStatus = (value: string) => {
  const normalized = normalizeApplicantStatus(value);
  if (!normalized) return null;
  if (normalized === "doc_passed") return "doc_pass";
  if (normalized === "final_passed") return "final_pass";
  if (normalized === "rejected") return "rejected";
  if (normalized === "interview_scheduled") return "interview_scheduled";
  if (normalized === "interview_done") return "interview_done";
  if (normalized === "interview") return "interview";
  if (normalized === "submitted") return "submitted";
  return null;
};

const getNextMemberCode = async (isPresident: boolean) => {
  const base = isPresident ? 100000 : 20000;
  const { data, error } = await supabase
    .from("members")
    .select("member_code")
    .eq("president", isPresident)
    .order("member_code", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const currentRaw = data?.member_code ?? null;
  const current =
    typeof currentRaw === "number"
      ? currentRaw
      : typeof currentRaw === "string"
        ? Number.parseInt(currentRaw, 10)
        : null;

  if (current && Number.isFinite(current) && current >= base) {
    return String(current + 1);
  }

  return String(base);
};

const getAdminSession = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) return { admin: false };

  const { data } = await supabase
    .from("user")
    .select("members(president)")
    .eq("email", email)
    .maybeSingle();
  // @ts-expect-error
  return { admin: data?.members?.president === true };
};

export async function GET() {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("user")
    .select(`
      id,
      name,
      email,
      members (
        org,
        member_code,
        president
      ),
      applicants (
        status,
        application_submitted_at,
        doc_passed_at,
        interview_at,
        final_passed_at,
        rejected_at,
        doc_introduction,
        doc_motive,
        interview_choice_1,
        interview_choice_2,
        interview_choice_3,
        interview_request_at
      )
    `)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = (data ?? []).map((row) => ({
    ...row,
    members: normalizeSingle(row.members),
    applicants: normalizeSingle(row.applicants),
  }));

  return NextResponse.json({ members: normalized });
}

export async function PATCH(request: Request) {
  const { admin } = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const hasPresident = typeof body?.president === "boolean";
  const nextPresident = hasPresident ? body.president : null;
  const hasOrg = Object.prototype.hasOwnProperty.call(body ?? {}, "org");
  let nextOrg: string | null | undefined = undefined;
  if (hasOrg) {
    if (body.org === null) {
      nextOrg = null;
    } else if (typeof body.org === "string") {
      const trimmed = body.org.trim();
      nextOrg = trimmed.length > 0 ? trimmed : null;
    } else {
      return NextResponse.json({ error: "Invalid org" }, { status: 400 });
    }
  }
  const hasApplicantStatus = typeof body?.applicantStatus === "string";
  const nextApplicantStatus = hasApplicantStatus ? toDbApplicantStatus(body.applicantStatus) : null;

  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (hasApplicantStatus && !nextApplicantStatus) {
    return NextResponse.json({ error: "Invalid applicant status" }, { status: 400 });
  }

  if (hasApplicantStatus && nextApplicantStatus) {
    const { data: applicant } = await supabase
      .from("applicants")
      .select("user_id,status")
      .eq("user_id", id)
      .maybeSingle();

    const previousStatus = applicant?.status ?? null;
    const normalizedPrev = normalizeApplicantStatus(previousStatus);
    const normalizedNext = normalizeApplicantStatus(nextApplicantStatus);

    if (!applicant) {
      const { error: insertApplicantError } = await supabase
        .from("applicants")
        .insert({
          user_id: id,
          status: nextApplicantStatus,
        });

      if (insertApplicantError) {
        return NextResponse.json({ error: insertApplicantError.message }, { status: 500 });
      }
    } else {
      const { error: updateApplicantError } = await supabase
        .from("applicants")
        .update({ status: nextApplicantStatus })
        .eq("user_id", id);

      if (updateApplicantError) {
        return NextResponse.json({ error: updateApplicantError.message }, { status: 500 });
      }
    }

    const shouldNotify =
      (normalizedNext === "doc_passed" ||
        normalizedNext === "final_passed" ||
        normalizedNext === "rejected") &&
      normalizedNext !== normalizedPrev;

    if (shouldNotify) {
      const { data: user, error: userError } = await supabase
        .from("user")
        .select("name,email")
        .eq("id", id)
        .maybeSingle();

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      if (!user?.email) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      await sendApplicantStatusNotification({
        name: user.name ?? null,
        email: user.email,
        status: normalizedNext as "doc_passed" | "final_passed" | "rejected",
      });
    }
  }


  if (!hasPresident && !hasOrg) {
    return NextResponse.json({ ok: true });
  }

  const { data: member } = await supabase
    .from("members")
    .select("user_id, president, member_code")
    .eq("user_id", id)
    .maybeSingle();

  if (!member) {
    const memberCode = await getNextMemberCode(hasPresident ? nextPresident === true : false);
    const { error: insertError } = await supabase.from("members").insert({
      user_id: id,
      org: nextOrg ?? null,
      member_code: memberCode,
      president: hasPresident ? nextPresident : false,
      joined_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    const updates: Record<string, unknown> = {};

    if (hasPresident) {
      updates.president = nextPresident;
      const currentPresident = member.president === true;
      const nextIsPresident = nextPresident === true;
      if (currentPresident !== nextIsPresident) {
        const nextCode = await getNextMemberCode(nextIsPresident);
        updates.member_code = nextCode;
      }
    }
    if (hasOrg) updates.org = nextOrg ?? null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("members")
        .update(updates)
        .eq("user_id", id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
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
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
