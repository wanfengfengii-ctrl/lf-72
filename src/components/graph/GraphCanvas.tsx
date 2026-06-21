import { useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  ReactFlowInstance,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStore } from '@/store/useStore';
import { RelationType, RelationTypeColors } from '@/types';
import { getIsolatedFragments, getFragmentRelations } from '@/utils/analysis';
import FragmentNode from './FragmentNode';
import RelationEdge from './RelationEdge';

const nodeTypes = {
  fragment: FragmentNode
};

const edgeTypes = {
  relation: RelationEdge
};

interface GraphCanvasProps {
  onNodeClick?: (fragmentId: string) => void;
  onEdgeClick?: (relationId: string) => void;
  onConnect?: (sourceId: string, targetId: string) => void;
}

export default function GraphCanvas({
  onNodeClick,
  onEdgeClick,
  onConnect
}: GraphCanvasProps) {
  const {
    fragments,
    relations,
    selectedFragmentId,
    selectedRelationId,
    searchKeyword
  } = useStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const isolatedFragmentIds = useMemo(() => {
    const isolated = getIsolatedFragments(fragments, relations);
    return new Set(isolated.map((f) => f.id));
  }, [fragments, relations]);

  const initialPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    fragments.forEach((fragment, index) => {
      const angle = (index / fragments.length) * 2 * Math.PI - Math.PI / 2;
      positions[fragment.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    return positions;
  }, [fragments]);

  useEffect(() => {
    const newNodes: Node[] = fragments.map((fragment) => {
      const pos = initialPositions[fragment.id] || { x: 0, y: 0 };
      const relationCount = getFragmentRelations(fragment.id, relations).length;
      const isIsolated = isolatedFragmentIds.has(fragment.id);
      const isSelected = fragment.id === selectedFragmentId;

      const matchesSearch = searchKeyword
        ? fragment.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          fragment.name.toLowerCase().includes(searchKeyword.toLowerCase())
        : true;

      return {
        id: fragment.id,
        type: 'fragment',
        position: pos,
        data: {
          fragment,
          isSelected,
          isIsolated,
          relationCount
        },
        style: {
          opacity: matchesSearch ? 1 : 0.3,
          transition: 'opacity 0.3s ease'
        },
        selected: isSelected
      };
    });

    const newEdges: Edge[] = relations.map((relation) => {
      const color = RelationTypeColors[relation.type];
      const isSelected = relation.id === selectedRelationId;

      return {
        id: relation.id,
        source: relation.sourceId,
        target: relation.targetId,
        type: 'relation',
        data: {
          type: relation.type,
          confidence: relation.confidence,
          notes: relation.notes,
          isSelected
        },
        selected: isSelected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color
        },
        style: {
          stroke: color,
          strokeWidth: isSelected ? 3 : 2
        },
        animated: isSelected
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [
    fragments,
    relations,
    selectedFragmentId,
    selectedRelationId,
    isolatedFragmentIds,
    initialPositions,
    searchKeyword,
    setNodes,
    setEdges
  ]);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    instance.fitView({ padding: 0.2 });
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect?.(connection.source, connection.target);
      }
    },
    [onConnect]
  );

  const handlePaneClick = useCallback(() => {
    useStore.getState().selectFragment(null);
    useStore.getState().selectRelation(null);
  }, []);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        className="bg-stone-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D6D3D1" />
        <Controls 
          className="!bg-white !border !border-stone-200 !rounded-lg !shadow-md"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-white !border !border-stone-200 !rounded-lg !shadow-md"
          nodeColor={(node) => {
            const data = node.data as { fragment?: { isGrouped?: boolean } };
            return data?.fragment?.isGrouped ? '#F59E0B' : '#78716C';
          }}
          maskColor="rgba(245, 245, 244, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
