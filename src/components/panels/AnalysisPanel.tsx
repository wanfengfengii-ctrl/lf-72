import { useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Layers,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RelationTypeLabels, RelationTypeColors } from '@/types';

interface AnalysisPanelProps {
  onFragmentClick?: (fragmentId: string) => void;
  onRelationClick?: (relationId: string) => void;
}

export default function AnalysisPanel({
  onFragmentClick,
  onRelationClick
}: AnalysisPanelProps) {
  const { fragments, relations, getAnalysis, selectFragment, selectRelation } = useStore();

  const analysis = useMemo(() => getAnalysis(), [fragments, relations, getAnalysis]);

  const stats = [
    {
      label: '残片总数',
      value: analysis.totalFragments,
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      label: '缀合关系',
      value: analysis.totalRelations,
      icon: LinkIcon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: '孤立残片',
      value: analysis.isolatedFragments.length,
      icon: Zap,
      color: 'text-stone-600',
      bg: 'bg-stone-50'
    },
    {
      label: '已定组',
      value: analysis.groupedFragments.length,
      icon: CheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  ];

  const handleFragmentClick = (fragmentId: string) => {
    selectFragment(fragmentId);
    onFragmentClick?.(fragmentId);
  };

  const handleRelationClick = (relationId: string) => {
    selectRelation(relationId);
    onRelationClick?.(relationId);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 border-l border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-white">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          分析统计
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bg} rounded-lg p-3 border border-stone-100`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-stone-500">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              冲突关系
              {analysis.conflictingRelationGroups.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {analysis.conflictingRelationGroups.length} 组
                </span>
              )}
            </h3>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {analysis.conflictingRelationGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂无冲突关系
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.conflictingRelationGroups.map((group, groupIndex) => {
                  const fragmentIds = new Set<string>();
                  group.forEach((r) => {
                    fragmentIds.add(r.sourceId);
                    fragmentIds.add(r.targetId);
                  });
                  const fragmentCodes = Array.from(fragmentIds)
                    .map((id) => fragments.find((f) => f.id === id)?.code || id)
                    .join(' / ');

                  return (
                    <div key={groupIndex} className="p-3">
                      <div className="text-xs font-medium text-stone-600 mb-2">
                        冲突组 {groupIndex + 1}: {fragmentCodes}
                      </div>
                      <div className="space-y-1">
                        {group.map((relation) => {
                          const source = fragments.find((f) => f.id === relation.sourceId);
                          const target = fragments.find((f) => f.id === relation.targetId);
                          const color = RelationTypeColors[relation.type];

                          return (
                            <div
                              key={relation.id}
                              className="text-xs flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-1 rounded"
                              onClick={() => handleRelationClick(relation.id)}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-stone-400">
                                {source?.code} → {target?.code}
                              </span>
                              <span style={{ color }}>
                                {RelationTypeLabels[relation.type]}
                              </span>
                              <span className="text-stone-500">
                                {relation.confidence}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              高可信组合
              <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-600 rounded-full">
                ≥80%
              </span>
              {analysis.highConfidenceGroups.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                  {analysis.highConfidenceGroups.length} 组
                </span>
              )}
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {analysis.highConfidenceGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂无高可信组合
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.highConfidenceGroups.map((group, groupIndex) => {
                  const groupFragments = group.fragmentIds
                    .map((id) => fragments.find((f) => f.id === id))
                    .filter(Boolean);

                  return (
                    <div key={group.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-stone-600">
                          组合 {groupIndex + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                            {group.fragmentIds.length} 块残片
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                            平均 {group.avgConfidence}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {groupFragments.map((frag) => (
                          <span
                            key={frag!.id}
                            className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                            onClick={() => handleFragmentClick(frag!.id)}
                          >
                            {frag!.code}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1 pl-2 border-l-2 border-emerald-200">
                        {group.relations.map((relation) => {
                          const source = fragments.find((f) => f.id === relation.sourceId);
                          const target = fragments.find((f) => f.id === relation.targetId);
                          const color = RelationTypeColors[relation.type];

                          return (
                            <div
                              key={relation.id}
                              className="text-xs flex items-center gap-2 cursor-pointer hover:bg-emerald-50 p-1 rounded transition-colors"
                              onClick={() => handleRelationClick(relation.id)}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-stone-600">
                                {source?.code}—{target?.code}
                              </span>
                              <span style={{ color }} className="font-medium">
                                {RelationTypeLabels[relation.type]}
                              </span>
                              <span
                                className="ml-auto font-bold"
                                style={{ color }}
                              >
                                {relation.confidence}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-400" />
              孤立残片
            </h3>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {analysis.isolatedFragments.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂无孤立残片
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.isolatedFragments.map((fragment) => (
                  <div
                    key={fragment.id}
                    className="p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                    onClick={() => handleFragmentClick(fragment.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-stone-300" />
                      <span className="text-sm font-medium text-stone-700">
                        {fragment.code}
                      </span>
                      <span className="text-xs text-stone-500">
                        {fragment.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              已定组残片
            </h3>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {analysis.groupedFragments.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂无已定组残片
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.groupedFragments.map((fragment) => (
                  <div
                    key={fragment.id}
                    className="p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleFragmentClick(fragment.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm font-medium text-stone-700">
                        {fragment.code}
                      </span>
                      <span className="text-xs text-stone-500">
                        {fragment.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
