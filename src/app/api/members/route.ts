import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET() {
  const { data, error } = await supabase
    .from('members')
    .select(
      `
      org,
      member_code,
      role,
      president,
      user:user_id (
        id,
        name,
        email,
        birth,
        sex,
        school
      )
    `
    )
    .order('member_code', { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }

  type MemberRow = {
    user: {
      id: string;
      name: string | null;
      email: string;
      birth: string | null;
      sex: string | null;
      school: string | null;
    } | null;
    org: string | null;
    role: string | null;
    member_code: string | null;
    president: boolean | null;
  };

  const allMembers = (data ?? []) as unknown as MemberRow[];
  const filteredData = allMembers
    .map((row) => {
      if (!row.user) return null;
      return {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        birth: row.user.birth,
        sex: row.user.sex,
        school: row.user.school,
        org: row.org ?? null,
        role: row.role ?? null,
        member_code: row.member_code ?? null,
        president: row.president === true,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json(filteredData, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
