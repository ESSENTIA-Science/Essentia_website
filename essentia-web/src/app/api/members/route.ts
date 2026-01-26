import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // 요청 URL에서 타임스탬프 확인 (캐시 방지)
  const url = new URL(request.url);
  const timestamp = url.searchParams.get('ts');
  
  // 어드민과 동일한 쿼리로 모든 데이터 가져온 후 클라이언트에서 필터링
  const { data, error } = await supabase
    .from('members')
    .select('id, name,email, provider, birth, school, class, subClass, sex, depth_1,depth_2,depth_3,member_code')
    .order('class', { ascending: true, nullsFirst: false })
    .order('member_code', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

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

  // 클라이언트에서 필터링: 회원(class=2)과 임원진(class=1, 0)만 포함
  const allMembers = data ?? [];
  const filteredData = allMembers.filter(member => {
    const classValue = member.class;
    return classValue !== null && classValue !== undefined && classValue <= 2;
  });

  // 디버깅: 최근 업데이트된 멤버 확인
  const recentMembers = allMembers
    .filter(m => m.class === 2)
    .slice(0, 10)
    .map(m => ({ id: m.id, name: m.name, class: m.class, depth_1: m.depth_1 }));

  return NextResponse.json(filteredData, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Timestamp': timestamp || Date.now().toString(),
      'X-Total-Count': allMembers.length.toString(),
      'X-Filtered-Count': filteredData.length.toString(),
    },
  });
}
