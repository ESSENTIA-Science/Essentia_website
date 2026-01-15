import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const school = typeof body?.school === "string" ? body.school.trim() : "";
  const intro = typeof body?.intro === "string" ? body.intro.trim() : "";
  const motivation = typeof body?.motivation === "string" ? body.motivation.trim() : "";
  const agreed = Boolean(body?.agreed);

  if (!agreed || !school || !intro || !motivation) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(
      "id, name, email, birth, sex, school, class, subClass, depth_1, depth_2, depth_3, provider, member_code, application_submitted_at"
    )
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.application_submitted_at) {
    return NextResponse.json({ ok: true, alreadyApplied: true });
  }

  const applicationTime = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("members")
    .update({
      school,
      application_intro: intro,
      application_motivation: motivation,
      application_submitted_at: applicationTime,
    })
    .eq("id", member.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const mailTo = process.env.EMAIL_TO ?? "essentiascience@gmail.com";
  const subject = `[ESSENTIA] 입회 신청 - ${member.name ?? email}`;
  const text = [
    `이름: ${member.name ?? "-"}`,
    `이메일: ${member.email}`,
    `생일: ${member.birth ?? "-"}`,
    `성별: ${member.sex ?? "-"}`,
    `학교: ${school}`,
    `등급(class): ${member.class ?? "-"}`,
    `소속: ${member.depth_1 ?? "-"} / ${member.depth_2 ?? "-"} / ${member.depth_3 ?? "-"}`,
    `직책: ${member.subClass ?? "-"}`,
    `provider: ${member.provider ?? "-"}`,
    `member_code: ${member.member_code ?? "-"}`,
    "",
    "[자기 소개]",
    intro,
    "",
    "[입회 동기]",
    motivation,
  ].join("\n");

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: mailTo,
    subject,
    text,
  });

  return NextResponse.json({ ok: true, alreadyApplied: false });
}
