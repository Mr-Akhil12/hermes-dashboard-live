// src/components/ReactFlowPanel.tsx
'use client';

import { useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, type Node, type Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

export default function ReactFlowPanel({ nodes: initialNodes, edges: initialEdges, onNodeClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      attributionPosition="bottom-left"
      className="bg-[#0a0a0f]"
    >
      <Background gap={20} color="#1a1a2a" />
      <Controls className="bg-[#111118] border border-zinc-800 rounded-lg !shadow-none [&>button]:bg-[#111118] [&>button]:border-zinc-800 [&>button:hover]:bg-zinc-800" />
      <MiniMap className="bg-[#111118] border border-zinc-800 rounded-lg" nodeColor="#2a2a3a" maskColor="rgba(0,0,0,0.7)" />
    </ReactFlow>
  );
}
