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
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  ReactFlowInstance,
  MarkerType,
  NodeChange,
  applyNodeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStore } from '@/store/useStore';
import { RelationTypeColors } from '@/types';
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
    searchKeyword,
    nodePositions,
    setNodePosition,
    setNodePositions
  } = useStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const isFirstInit = useRef(true);

  const isolatedFragmentIds = useMemo(() => {
    const isolated = getIsolatedFragments(fragments, relations);
    return new Set(isolated.map((f) => f.id));
  }, [fragments, relations]);

  const defaultPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    fragments.forEach((fragment, index) => {
      if (!nodePositions[fragment.id]) {
        const angle = (index / fragments.length) * 2 * Math.PI - Math.PI / 2;
        positions[fragment.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      }
    });

    return positions;
  }, [fragments, nodePositions]);

  const handleNodesChangePersist = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && typeof change.id === 'string') {
          setNodePosition(change.id, {
            x: change.position.x,
            y: change.position.y
          });
        }
      });
    },
    [onNodesChange, setNodePosition]
  );

  useEffect(() => {
    const newNodes: Node[] = fragments.map((fragment) => {
      const savedPos = nodePositions[fragment.id];
      const defaultPos = defaultPositions[fragment.id];
      const pos = savedPos || defaultPos || { x: 0, y: 0 };

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

    setNodes((currentNodes) => {
      const positionMap = new Map(currentNodes.map((n) => [n.id, n.position]));
      return newNodes.map((n) => ({
        ...n,
        position: positionMap.has(n.id) ? positionMap.get(n.id)! : n.position
      }));
    });
    setEdges(newEdges);
  }, [
    fragments,
    relations,
    selectedFragmentId,
    selectedRelationId,
    isolatedFragmentIds,
    defaultPositions,
    nodePositions,
    searchKeyword,
    setNodes,
    setEdges
  ]);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    if (isFirstInit.current && Object.keys(nodePositions).length === 0) {
      instance.fitView({ padding: 0.2 });
    }
    isFirstInit.current = false;
  }, [nodePositions]);

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
        onNodesChange={handleNodesChangePersist}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={Object.keys(nodePositions).length === 0}
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
