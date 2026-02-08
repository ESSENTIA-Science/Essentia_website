'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from "./page.module.css";
import { getDepth1Names, type Organization } from '@/components/organization/OrganizationSection';
import profileImage from '../asset/profile.webp';

export type Member = {
  id: string;
  name: string | null;
  email: string;
  birth: string | null;
  sex: string | null;
  school: string | null;
  org: string | null;
  member_code: string | null;
  role: string | null;
  president: boolean;
}

export default function Members() {
  const pathname = usePathname();
  const [members, setMembers] = useState<Member[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const loadMembersData = async () => {
    try {
      const timestamp = Date.now();
      const [membersRes, orgRes] = await Promise.all([
        fetch(`/api/members?ts=${timestamp}&_=${Math.random()}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }),
        fetch(`/api/organizations?ts=${timestamp}`, { cache: 'no-store' }),
      ]);
      const membersData = await membersRes.json();
      const orgData = await orgRes.json();
      
      if (!membersRes.ok) throw new Error(membersData?.error ?? 'Failed to load members');
      if (!orgRes.ok) throw new Error(orgData?.error ?? 'Failed to load organizations');
      setMembers(membersData ?? []);
      console.log(membersData);
      setOrgs(orgData.organizations ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Members] Failed to load data', message);
    }
  };

  useEffect(() => {
    loadMembersData();
  }, [pathname]);

  useEffect(() => {
    const handleFocus = () => {
      console.log('[Members] Window focused, reloading...');
      loadMembersData();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Members] Page visible, reloading...');
        loadMembersData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 5초마다 자동 새로고침 (페이지가 보일 때만)
    const intervalId = setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        console.log('[Members] Auto refresh (5s interval)...');
        loadMembersData();
      }
    }, 5000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  const executives = useMemo(
    () => members.filter(member => member.president),
    [members]
  );

  const depth1Titles = useMemo(() => getDepth1Names(orgs), [orgs]);

  const depth1Groups = useMemo(() => {
    const map = new Map<string, Member[]>();
    let processedCount = 0;
    
    for (const member of members) {
      processedCount++;
      const depth1 = member.org?.trim() || '부서 미지정';
      const list = map.get(depth1) ?? [];
      list.push(member);
      map.set(depth1, list);
    }
    
    const allDepth1Names = new Set(depth1Titles);
    map.forEach((_list, depth1) => {
      allDepth1Names.add(depth1);
    });
    
    const groups = Array.from(allDepth1Names)
      .sort()
      .map(depth1 => {
        const list = map.get(depth1) ?? [];
        return {
          depth1,
          members: list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        };
      })
      .filter(group => group.members.length > 0); 
    
    console.log('[Members] depth1Groups processing:');
    console.log('  - Total members:', members.length);
    console.log('  - Processed (member rows):', processedCount);
    console.log('  - Groups created:', groups.length);
    console.log('  - Total members in groups:', groups.reduce((sum, g) => sum + g.members.length, 0));
    
    return groups;
  }, [members, depth1Titles]);

  const getProfileImage = (member: Member) => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl || !member.member_code) return profileImage.src;
    return `${baseUrl}/storage/v1/object/public/profile_img/${member.member_code}.webp`;
  };

  const getRoleLabel = (member: Member) => member.role ?? (member.president ? "임원진" : "회원");

  return(
    <div className={styles.page}>
      <div className={styles.memberGrid}>
        <div className={styles.executiveGrid}>
          <p className={styles.title}>임원진</p>
          <div className={styles.memberList}>
            {executives.map(member => (
              <div key={member.id} className={styles.memberCard}>
                <img
                  className={styles.avatar}
                  src={getProfileImage(member)}
                  alt=""
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (target.src !== profileImage.src) {
                      target.src = profileImage.src;
                    }
                  }}
                />
                <div className={styles.info}>
                  <div className={styles.name}>{member.name ?? '-'}</div>
                  <div className={styles.school}>{getRoleLabel(member)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {depth1Groups.map(group => (
          <div key={group.depth1} className={styles.depthGroup}>
            <p className={styles.title}>{group.depth1}</p>
            <div className={styles.memberList}>
              {group.members.map(member => (
                <div key={member.id} className={styles.memberCard}>
                  <img
                    className={styles.avatar}
                    src={getProfileImage(member)}
                    alt=""
                    onError={(event) => {
                      const target = event.currentTarget;
                      if (target.src !== profileImage.src) {
                        target.src = profileImage.src;
                      }
                    }}
                  />
                  <div className={styles.info}>
                    <div className={styles.name}>{member.name ?? '-'}</div>
                    {member.school && <div className={styles.school}>{member.school}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
