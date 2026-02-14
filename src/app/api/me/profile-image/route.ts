import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const PROFILE_BUCKET = "profile_img";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;

    if (!session || !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.type !== "image/webp") {
      return NextResponse.json({ error: "Only webp files are allowed" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image must be 1B to 10MB" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user")
      .select("members(member_code)")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const memberRelation = data?.members as
      | { member_code: string | number | null }
      | { member_code: string | number | null }[]
      | null
      | undefined;
    const member = normalizeSingle(memberRelation);
    const rawMemberCode = member?.member_code;
    const memberCode =
      typeof rawMemberCode === "string"
        ? rawMemberCode.trim()
        : rawMemberCode == null
          ? ""
          : String(rawMemberCode).trim();

    if (!memberCode) {
      return NextResponse.json({ error: "Member code not found" }, { status: 403 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = `${memberCode}.webp`;

    const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(path, bytes, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      path,
      url: publicData?.publicUrl ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
