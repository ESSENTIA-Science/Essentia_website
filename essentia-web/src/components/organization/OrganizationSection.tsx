'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ReactFlow, Background, EdgeText, Controls } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import styles from './OrganizationSection.module.css';
import '@xyflow/react/dist/style.css';
import CustomNode from './customNode';

export type Organization = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
};

export const getDepth1Names = (orgs: Organization[]) =>
  orgs.filter(org => org.depth === 1).map(org => org.name);

export default function OrganizationSection() {
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations?ts=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to load organizations');
      }

      setError(null);
      setOrgs(data.organizations ?? []);
      console.log('[OrganizationSection] organizations', data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs, pathname]);

  useEffect(() => {
    const handleFocus = () => {
      fetchOrgs();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const handleOrgUpdate = () => {
      fetchOrgs();
    };
    window.addEventListener('orgs:updated', handleOrgUpdate);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('orgs:updated', handleOrgUpdate);
    };
  }, [fetchOrgs]);
  
  const nodeTypes = {
    custom: CustomNode,
  };

  const { nodes, edges } = useMemo(() => {
    const spacingX = 180;
    const spacingY = 110;
    const yOffset = 40;
    const orgMap = new Map(orgs.map(org => [org.id, org]));
    const childrenMap = new Map<string, Organization[]>();
    for (const org of orgs) {
      if (!org.parent_id) continue;
      const list = childrenMap.get(org.parent_id) ?? [];
      list.push(org);
      childrenMap.set(org.parent_id, list);
    }

    const roots = orgs.filter(org => !org.parent_id || !orgMap.has(org.parent_id));
    const widths = new Map<string, number>();

    const calcWidth = (id: string): number => {
      const children = childrenMap.get(id) ?? [];
      if (children.length === 0) {
        widths.set(id, 1);
        return 1;
      }
      const sum = children.reduce((acc, child) => acc + calcWidth(child.id), 0);
      widths.set(id, sum);
      return sum;
    };

    const totalUnits = roots.reduce((acc, root) => acc + calcWidth(root.id), 0);
    const positions = new Map<string, { x: number; y: number }>();

    const place = (id: string, depth: number, startUnits: number) => {
      const widthUnits = widths.get(id) ?? 1;
      const centerUnits = startUnits + widthUnits / 2;
      const x = (centerUnits - totalUnits / 2) * spacingX;
      const y = depth * spacingY + yOffset;
      positions.set(id, { x, y });

      let offset = startUnits;
      const children = childrenMap.get(id) ?? [];
      for (const child of children) {
        const childWidth = widths.get(child.id) ?? 1;
        place(child.id, depth + 1, offset);
        offset += childWidth;
      }
    };

    let cursor = 0;
    for (const root of roots) {
      place(root.id, 0, cursor);
      cursor += widths.get(root.id) ?? 1;
    }

    const nodesResult: Node[] = orgs.map(org => {
      const pos = positions.get(org.id) ?? { x: 0, y: 0 };
      return {
        id: org.id,
        position: pos,
        data: { label: org.name },
        type: 'custom',
      };
    });

    const edgesResult: Edge[] = orgs
      .filter(org => org.parent_id)
      .map(org => ({
        id: `${org.parent_id}-${org.id}`,
        source: org.parent_id as string,
        target: org.id,
        type: 'smoothstep',
      }));
    return { nodes: nodesResult, edges: edgesResult };
  }, [orgs]);
  console.log(orgs)

  if (loading) {
    return (
      <section className={styles.wrapper}>
        <p>Loading organization…</p>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    );
  }

  return (
    <div className={styles.flowWrap}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        // zoomOnScroll={false}
        panOnScroll={false}
        onlyRenderVisibleElements={true}
        nodeTypes={nodeTypes}
      >
        <Background bgColor="#2c6674ff" lineWidth={10} />
        <EdgeText
          x={100}
          y={100}
          labelStyle={{ fill: 'white' }}
          labelShowBg 
          labelBgPadding={[2, 4]}
          labelBgBorderRadius={2}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
