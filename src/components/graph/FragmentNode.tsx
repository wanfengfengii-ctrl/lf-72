import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Fragment } from '@/types';

interface FragmentNodeData {
  fragment: Fragment;
  isSelected: boolean;
  isIsolated: boolean;
  relationCount: number;
}

function FragmentNodeComponent({ data, selected }: NodeProps<FragmentNodeData>) {
  const { fragment, isIsolated, relationCount } = data;

  return (
    <div
      className={`
        relative min-w-[120px] px-4 py-3 rounded-lg border-2 
        transition-all duration-200 cursor-pointer
        ${selected 
          ? 'border-amber-600 shadow-lg shadow-amber-500/30 scale-105' 
          : 'border-stone-300 hover:border-amber-400 hover:shadow-md'
        }
        ${fragment.isGrouped 
          ? 'bg-amber-50' 
          : 'bg-white'
        }
        ${isIsolated ? 'opacity-70' : ''}
      `}
      style={{
        background: fragment.isGrouped 
          ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' 
          : 'linear-gradient(135deg, #FAFAF9 0%, #F5F5F4 100%)',
        clipPath: 'polygon(5% 0%, 95% 5%, 100% 90%, 85% 100%, 10% 95%, 0% 15%)'
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />

      <div className="text-center">
        <div className={`
          font-bold text-sm mb-1
          ${fragment.isGrouped ? 'text-amber-900' : 'text-stone-700'}
        `}>
          {fragment.code}
        </div>
        <div className="text-xs text-stone-500 truncate max-w-[100px]">
          {fragment.name}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {fragment.isGrouped && (
            <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
              已定组
            </span>
          )}
          {isIsolated && (
            <span className="text-xs px-2 py-0.5 bg-stone-200 text-stone-600 rounded-full">
              孤立
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-stone-400">
          {relationCount} 条关系
        </div>
      </div>
    </div>
  );
}

export default memo(FragmentNodeComponent);
