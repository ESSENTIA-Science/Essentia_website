import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const DEFAULT_BUCKET = "forum_images";

const getFileExtension = (file: File) => {
  const mime = file.type.toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";

  const fileNameParts = file.name.split(".");
  const ext = fileNameParts[fileNameParts.length - 1]?.toLowerCase();
  if (!ext) return null;
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return null;
};

export async function POST(request: Request) {
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

  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Image must be 1B to 5MB" }, { status: 400 });
  }

  const extension = getFileExtension(file);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
  }

  const { data: user, error: userError } = await supabase
    .from("user")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bucket = process.env.SUPABASE_FORUM_BUCKET ?? DEFAULT_BUCKET;
  const path = `${user.id}/${Date.now()}-${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!publicUrlData?.publicUrl) {
    return NextResponse.json({ error: "Failed to create public URL" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: publicUrlData.publicUrl,
    path,
    bucket,
  });
}
