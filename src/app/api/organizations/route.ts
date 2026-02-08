import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function GET() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, parent_id, depth")
    .order("depth")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { organizations: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// export async function GET() {
//   const { data, error } = await supabase
//     .from('organizations')
//     .select('id, name, parent_id, depth')
//     .order('depth')
//     .order('name');

//   if (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }

//   return NextResponse.json(data, {
//     headers: {
//       'Cache-Control': 'no-store',
//     },
//   });
// }
