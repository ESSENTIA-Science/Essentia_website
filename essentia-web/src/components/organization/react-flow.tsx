"use client"

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { supabase } from '@/lib/supabaseClient';

type Organization = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
};

import '@xyflow/react/dist/style.css';
 
type NodeData = { label: string };

// Bounding box where nodes are allowed to be positioned (in px, relative to ReactFlow coordinate space)
// You can make this dynamic by measuring the container and updating these values.
const nodeBox = { x: 0, y: 0, width: 1200, height: 600 };

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

const initialNodes: Node[] = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];
 
export default function Reactflow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? 'Failed to load organizations');
        }

        setError(null);
        setOrgs(data);

        const defaultOrg =
          data.find((o: any) => o.name === '?´ì˜ë¶€') ??
          data.find((o: any) => o.depth === 1);

        if (defaultOrg) setSelectedId(defaultOrg.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, []);


  const departments = orgs.filter(o => o.depth === 1);
  const selected = orgs.find(o => o.id === selectedId);
  const children = orgs.filter(o => o.parent_id === selectedId);


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nodesSnapshot) => {
      const applied = applyNodeChanges(changes, nodesSnapshot);

      // clamp node positions within nodeBox
      return applied.map((n) => {
        if (!n.position) return n;
        const minX = nodeBox.x - nodeBox.width/2;
        const maxX = nodeBox.x + nodeBox.width/2;
        const minY = nodeBox.y - nodeBox.height/2;
        const maxY = nodeBox.y + nodeBox.height/2;

        return {
          ...n,
          position: {
            x: clamp(n.position.x, minX, maxX),
            y: clamp(n.position.y, minY, maxY),
          },
        };
      });
    }),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );
 
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div id="node-box" style={{ width: nodeBox.width, height: nodeBox.height, border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          panOnDrag={false}

          fitView
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}