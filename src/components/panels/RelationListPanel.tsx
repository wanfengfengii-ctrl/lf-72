import { useMemo } from 'react';
import { Plus, Link, Edit2, Trash2, Filter } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RelationType, RelationTypeLabels, RelationTypeColors } from '@/types';

interface RelationListPanelProps {
  onAddRelation: () => void;
  onEditRelation: (id: string) => void;
  onDeleteRelation: (id: string) => void;
}

export default function RelationListPanel({
  onAddRelation,
  onEditRelation,
  onDeleteRelation
}: RelationListPanelProps) {
  const {
    fragments,
    relations,
    filterType,
    filterConfidenceMin,
    setFilterType,
    setFilterConfidenceMin,
    selectedRelationId,
    selectRelation
  } = useStore();

  const fragmentMap = useMemo(() => {
    const map = new Map<string, typeof fragments[0]>();
    fragments.forEach((f) => map.set(f.id, f));
    return map;
  }, [fragments]);

  const filteredRelations = useMemo(() => {
    return relations.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) {
        return false;
      }
      if (r.confidence < filterConfidenceMin) {
        return false;
      }
      return true;
    });
  }, [relations, filterType, filterConfidenceMin]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-stone-200">
      <div className="p-4 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Link className="w-5 h-5 text-emerald-600" />
            缀合关系
          </h2>
          <button
            onClick={onAddRelation}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            依据类型
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as RelationType | 'all')}
            className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">全部类型</option>
            {Object.entries(RelationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">
              最低可信度: {filterConfidenceMin}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterConfidenceMin}
              onChange={(e) => setFilterConfidenceMin(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>

        <div className="mt-3 text-xs text-stone-500">
          共 {filteredRelations.length} 条关系
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRelations.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            暂无缀合关系
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredRelations.map((relation) => {
              const source = fragmentMap.get(relation.sourceId);
              const target = fragmentMap.get(relation.targetId);
              const isSelected = relation.id === selectedRelationId;
              const color = RelationTypeColors[relation.type];

              if (!source || !target) return null;

              return (
                <div
                  key={relation.id}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-emerald-50 border-l-4 border-emerald-500' 
                      : 'hover:bg-stone-50 border-l-4 border-transparent'
                    }
                  `}
                  onClick={() => selectRelation(relation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ 
                            backgroundColor: `${color}20`, 
                            color 
                          }}
                        >
                          {RelationTypeLabels[relation.type]}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-stone-700">
                          <span className="font-medium">{source.code}</span>
                          <span className="mx-2 text-stone-400">→</span>
                          <span className="font-medium">{target.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRelation(relation.id);
                          }}
                          className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定要删除这条缀合关系吗？')) {
                              onDeleteRelation(relation.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-stone-500">
                        可信度: 
                        <span 
                          className="font-semibold ml-1"
                          style={{ color }}
                        >
                          {relation.confidence}%
                        </span>
                      </div>
                    </div>
                    {relation.notes && (
                      <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                        {relation.notes}
                      </p>
                    )}
                  </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
