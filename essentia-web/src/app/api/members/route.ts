import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버에서만 사용
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

  console.log('[API /members] Request time:', new Date().toISOString());
  console.log('[API /members] Total members from DB:', allMembers.length);
  console.log('[API /members] Filtered members (class <= 2):', filteredData.length);
  console.log('[API /members] Recent class=2 members:', recentMembers);
  console.log('[API /members] Excluded members:', allMembers
    .filter(m => m.class === null || m.class === undefined || m.class > 2)
    .slice(0, 10)
    .map(m => ({ id: m.id, name: m.name, class: m.class })));

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
