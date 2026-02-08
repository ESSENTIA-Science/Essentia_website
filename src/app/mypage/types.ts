export type MemberInfo = {
  org: string | null;
  member_code: string | null;
  president: boolean | null;
};

export type ApplicantInfo = {
  status: string | null;
  application_submitted_at?: string | null;
  doc_passed_at?: string | null;
  interview_at?: string | null;
  final_passed_at?: string | null;
  rejected_at?: string | null;
  doc_introduction?: string | null;
  doc_motive?: string | null;
  interview_choice_1?: string | null;
  interview_choice_2?: string | null;
  interview_choice_3?: string | null;
  interview_request_at?: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  birth: string | null;
  sex: string | null;
  school: string | null;
  members: MemberInfo | null;
  applicants: ApplicantInfo | null;
};

export type Org = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
};

export type MemberRole = "president" | "member" | "external";

export type ApplicantProgress = {
  statusLabel: string;
  nextLabel: string;
  message: string;
};
