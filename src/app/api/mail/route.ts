import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendApplyNotification,
  sendInterviewChoicesNotification,
  sendInterviewNotice,
} from "@/lib/mail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const normalizeApplicantStatus = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "doc_pass" || normalized === "doc_passed" || normalized === "document_passed") {
    return "doc_passed";
  }
  return normalized;
};

const parseChoice = (value: string) => {
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

async function getSessionEmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  return { session, email };
}

async function requireAdmin(email: string) {
  const { data, error } = await supabase
    .from("user")
    .select("id,members(president)")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  const members = normalizeSingle(data?.members);
  return { ok: members?.president === true };
}

export async function POST(request: Request) {
  const { session, email } = await getSessionEmail();
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const type = typeof body?.type === "string" ? body.type.trim() : "";

  if (type === "apply") {
    const school = typeof body?.school === "string" ? body.school.trim() : "";
    const intro = typeof body?.intro === "string" ? body.intro.trim() : "";
    const motivation = typeof body?.motivation === "string" ? body.motivation.trim() : "";
    const agreed = Boolean(body?.agreed);

    if (!agreed || !school || !intro || !motivation) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id, name, email, birth, sex, school")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 403 });
    }

    const { data: existingApplicant } = await supabase
      .from("applicants")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingApplicant) {
      return NextResponse.json({
        ok: true,
        alreadyApplied: true,
        status: existingApplicant.status,
      });
    }

    const applicationTime = new Date().toISOString();

    await supabase.from("user").update({ school }).eq("id", user.id);

    const { error: insertApplicantError } = await supabase
      .from("applicants")
      .insert({
        user_id: user.id,
        status: "submitted",
        application_submitted_at: applicationTime,
        doc_introduction: intro,
        doc_motive: motivation,
      });

    if (insertApplicantError) {
      return NextResponse.json({ error: insertApplicantError.message }, { status: 500 });
    }

    await sendApplyNotification({
      name: user.name ?? null,
      email: user.email,
      school,
      submittedAt: applicationTime,
      intro,
      motivation,
    });

    return NextResponse.json({ ok: true, alreadyApplied: false });
  }

  if (type === "interview") {
    const rawChoices = Array.isArray(body?.choices) ? body.choices : [];
    const choices = [0, 1, 2].map((index) => {
      const value = rawChoices[index];
      if (typeof value === "string") return value.trim();
      return "";
    });

    if (!choices[0]) {
      return NextResponse.json({ error: "First choice required" }, { status: 400 });
    }

    const provided = choices.filter((value) => value.length > 0);
    const unique = new Set(provided);
    if (unique.size !== provided.length) {
      return NextResponse.json({ error: "Duplicate choices" }, { status: 400 });
    }

    const parsedChoices = choices.map((value) => (value ? parseChoice(value) : null));
    if (parsedChoices.some((value, index) => choices[index] && !value)) {
      return NextResponse.json({ error: "Invalid datetime" }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id,name,email")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("id,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (applicantError) {
      return NextResponse.json({ error: applicantError.message }, { status: 500 });
    }

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const normalizedStatus = normalizeApplicantStatus(applicant.status);
    if (normalizedStatus !== "doc_passed") {
      return NextResponse.json({ error: "Invalid applicant status" }, { status: 403 });
    }

    const requestTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("applicants")
      .update({
        interview_choice_1: parsedChoices[0],
        interview_choice_2: parsedChoices[1],
        interview_choice_3: parsedChoices[2],
        interview_request_at: requestTime,
        updated_at: requestTime,
      })
      .eq("id", applicant.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await sendInterviewChoicesNotification({
      name: user.name ?? null,
      email: user.email ?? email,
      choices: parsedChoices,
      requestedAt: requestTime,
    });

    return NextResponse.json({ ok: true });
  }

  if (type === "interview_notice") {
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const interviewAtRaw = typeof body?.interviewAt === "string" ? body.interviewAt.trim() : "";
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const adminCheck = await requireAdmin(email);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: 500 });
    }
    if (!adminCheck.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: target, error: targetError } = await supabase
      .from("user")
      .select("id,name,email,applicants(interview_at)")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }

    if (!target?.email) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const applicant = normalizeSingle(target.applicants);
    const parsedInterviewAt = interviewAtRaw ? parseChoice(interviewAtRaw) : null;
    const interviewAt = parsedInterviewAt ?? applicant?.interview_at ?? null;
    if (!interviewAt) {
      return NextResponse.json({ error: "Missing interview time" }, { status: 400 });
    }

    await sendInterviewNotice({
      name: target.name ?? null,
      email: target.email,
      interviewAt,
      meetingUrl: "https://meet.google.com/wrx-qoko-wsf",
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
