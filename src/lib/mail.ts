import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import path from "node:path";

const resend = new Resend(process.env.RESEND_API_KEY);

const getFrom = () => process.env.EMAIL_FROM ?? "ESSENTIA Science <no-reply@essentia-sci.org>";
const getTo = () => process.env.EMAIL_TO ?? "admin@essentia-sci.org";

const formatKst = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
};

const getTemplatePath = (name: string) =>
  path.join(process.cwd(), "src", "components", name);

const loadTemplate = async (name: string) => {
  try {
    return await readFile(getTemplatePath(name), "utf8");
  } catch {
    return null;
  }
};

const renderTemplate = (html: string, params: Record<string, string>) => {
  let output = html;
  Object.entries(params).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, value);
  });
  return output;
};

const withAbsoluteAssets = (html: string) => {
  const baseUrl = process.env.APP_BASE_URL ?? "https://www.essentia-sci.org";
  return html.replace(/src="\.\/([^"]+)"/g, `src="${baseUrl}/$1"`);
};

export async function sendApplyNotification(params: {
  name: string | null;
  email: string;
  school: string;
  submittedAt: string;
  intro: string;
  motivation: string;
}) {
  const subject = "새 입회 신청";
  const html = `
    <h2>새 입회 신청</h2>
    <p><strong>이름:</strong> ${params.name ?? "-"}</p>
    <p><strong>이메일:</strong> ${params.email}</p>
    <p><strong>학교:</strong> ${params.school}</p>
    <p><strong>신청 시각:</strong> ${formatKst(params.submittedAt)}</p>
    <hr/>
    <p><strong>자기소개</strong></p>
    <p>${params.intro.replace(/\n/g, "<br/>")}</p>
    <p><strong>입회 동기</strong></p>
    <p>${params.motivation.replace(/\n/g, "<br/>")}</p>
  `;

  await resend.emails.send({
    from: getFrom(),
    to: getTo(),
    subject,
    html,
  });
}

export async function sendInterviewChoicesNotification(params: {
  name: string | null;
  email: string;
  choices: Array<string | null>;
  requestedAt: string;
}) {
  const subject = `[ESSENTIA Science] 면접 일정 선택 - ${params.name ?? params.email}`;
  const html = `
    <h2>면접 일정 선택</h2>
    <p><strong>이름:</strong> ${params.name ?? "-"}</p>
    <p><strong>이메일:</strong> ${params.email}</p>
    <hr/>
    <p><strong>면접 일정 후보 (KST)</strong></p>
    <p>1순위: ${formatKst(params.choices[0])}</p>
    <p>2순위: ${formatKst(params.choices[1])}</p>
    <p>3순위: ${formatKst(params.choices[2])}</p>
    <p><strong>제출 시각:</strong> ${formatKst(params.requestedAt)}</p>
  `;

  await resend.emails.send({
    from: getFrom(),
    to: getTo(),
    subject,
    html,
  });
}

export async function sendInterviewNotice(params: {
  name: string | null;
  email: string;
  interviewAt: string;
  meetingUrl: string;
}) {
  const subject = `[ESSENTIA Science] 면접 안내 - ${params.name ?? params.email}`;
  const rawTemplate = await loadTemplate("interview.html");
  const html = rawTemplate
    ? withAbsoluteAssets(
        renderTemplate(rawTemplate, {
          INTERVIEW_TIME: formatKst(params.interviewAt),
        })
      )
    : `
      <h2>면접 안내</h2>
      <p><strong>이름:</strong> ${params.name ?? "-"}</p>
      <p><strong>면접 시간 (KST):</strong> ${formatKst(params.interviewAt)}</p>
      <p><strong>면접 URL:</strong> <a href="${params.meetingUrl}">${params.meetingUrl}</a></p>
    `;

  await resend.emails.send({
    from: getFrom(),
    to: params.email,
    subject,
    html,
  });
}

export async function sendApplicantStatusNotification(params: {
  name: string | null;
  email: string;
  status: "doc_passed" | "final_passed" | "rejected";
}) {
  const templateMap: Record<typeof params.status, { subject: string; file: string }> = {
    doc_passed: { subject: "[ESSENTIA Science] 서류 합격 안내", file: "doc_pass.html" },
    final_passed: { subject: "[ESSENTIA Science] 최종 합격 안내", file: "passed.html" },
    rejected: { subject: "[ESSENTIA Science] 불합격 안내", file: "dispassed.html" },
  };

  const template = templateMap[params.status];
  const rawHtml = await loadTemplate(template.file);
  const html = rawHtml
    ? withAbsoluteAssets(
        renderTemplate(rawHtml, {
          Name: params.name ?? "-",
        })
      )
    : `<p>${params.name ?? "-"}님, 안내 메일입니다.</p>`;

  await resend.emails.send({
    from: getFrom(),
    to: params.email,
    subject: template.subject,
    html,
  });
}
