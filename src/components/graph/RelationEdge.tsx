import { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from 'reactflow';
import { RelationTypeColors, RelationTypeLabels, RelationType } from '@/types';

interface RelationEdgeData {
  type: RelationType;
  confidence: number;
  notes: string;
  isSelected: boolean;
}

function RelationEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
  id
}: EdgeProps<RelationEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const color = data ? RelationTypeColors[data.type] : '#7F8C8D';
  const label = data ? RelationTypeLabels[data.type] : '';
  const confidence = data?.confidence ?? 0;
  const isSelected = selected || data?.isSelected;

  const strokeWidth = isSelected ? 3 : 2;
  const opacity = confidence / 100 * 0.6 + 0.4;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: color,
          strokeWidth,
          opacity,
          filter: isSelected ? `drop-shadow(0 0 4px ${color})` : undefined
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
        >
          <div
            className={`
              px-2 py-1 rounded text-xs font-medium whitespace-nowrap
              transition-all duration-200
              ${isSelected ? 'scale-110' : ''}
            `}
            style={{
              backgroundColor: 'white',
              color: color,
              border: `1px solid ${color}`,
              boxShadow: isSelected ? `0 0 6px ${color}40` : '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex items-center gap-1">
              <span>{label}</span>
              <span className="opacity-70">{confidence}%</span>
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationEdgeComponent);
