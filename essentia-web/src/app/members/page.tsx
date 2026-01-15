'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from "./page.module.css";
import { getDepth1Names, type Organization } from '@/components/organization/OrganizationSection';
import profileImage from '../asset/profile.webp';

export type member = {
  id: string;
  name: string;
  email: string;
  provider: string;
  birth: string;
  sex: string;
  school: string | null;
  class: number;
  subClass: string | null;
  depth_1: string | null;
  depth_2: string | null;
  depth_3: string | null;
  member_code: string;
}

export function memberCard() {
  return(
    <>
      <div className={styles.name}></div>
      <div className={styles.depth1}></div>
      <div className={styles.depth2}></div>
    </>
  )
}

export function memberCardE() {
  return(
    <>
      <div className={styles.name}></div>
      <div className={styles.subClass}></div>
    </>
  )
}

export default function members() {
  const [members, setMembers] = useState<member[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch(`/api/members?ts=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'omit',
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? 'Failed to load organizations');
        }

        setError(null);
        setMembers(data);
        console.log('[OrganizationSection] organizations', data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, []);
  console.log(members)

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await fetch(`/api/organizations?ts=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'omit',
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? 'Failed to load organizations');
        }

        setOrgs(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      }
    };

    fetchOrganizations();
  }, []);

  const executives = useMemo(
    () => members.filter(member => member.class <= 1),
    [members]
  );

  const depth1Titles = useMemo(() => getDepth1Names(orgs), [orgs]);

  const depth1Groups = useMemo(() => {
    const map = new Map<string, member[]>();
    for (const member of members) {
      const depth1 = member.depth_1?.trim();
      if (!depth1) continue;
      const list = map.get(depth1) ?? [];
      list.push(member);
      map.set(depth1, list);
    }
    return depth1Titles.map(depth1 => {
      const list = map.get(depth1) ?? [];
      return {
        depth1,
        members: list.sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }, [members, depth1Titles]);

  const getProfileImage = (member: member) => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl || !member.member_code) return profileImage.src;
    return `${baseUrl}/storage/v1/object/public/profile_img/${member.member_code}.webp`;
  };

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
                  <div className={styles.name}>{member.name}</div>
                  {member.subClass && <div className={styles.school}>{member.subClass}</div>}
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
                    <div className={styles.name}>{member.name}</div>
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
