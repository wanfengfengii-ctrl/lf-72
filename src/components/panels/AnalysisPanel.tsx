import { useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Layers,
  Link as LinkIcon,
  Zap,
  Sparkles,
  Info,
  Award
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RelationTypeLabels, RelationTypeColors, ConflictGroupTypeLabels } from '@/types';

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

        <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 bg-red-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              真实冲突
              {analysis.conflictingRelationGroups.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {analysis.conflictingRelationGroups.length} 组
                </span>
              )}
              <span className="ml-auto text-xs text-stone-400 font-normal flex items-center gap-1">
                <Info className="w-3 h-3" />
                需人工复核判定
              </span>
            </h3>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {analysis.conflictingRelationGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂无真实冲突关系
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.conflictingRelationGroups.map((group) => {
                  const fragmentCodes = group.fragmentPair
                    .map((id) => fragments.find((f) => f.id === id)?.code || id)
                    .join(' ↔ ');

                  return (
                    <div key={group.id} className="p-3 bg-red-50/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-red-700">
                          {fragmentCodes}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            {group.relations.length} 条证据
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            平均 {group.avgConfidence}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-red-300">
                        {group.relations.map((relation) => {
                          const source = fragments.find((f) => f.id === relation.sourceId);
                          const target = fragments.find((f) => f.id === relation.targetId);
                          const color = RelationTypeColors[relation.type];

                          return (
                            <div
                              key={relation.id}
                              className="text-xs flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors"
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

        <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              多证据支持
              {analysis.multiEvidenceGroups.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                  {analysis.multiEvidenceGroups.length} 组
                </span>
              )}
              <span className="ml-auto text-xs text-stone-400 font-normal flex items-center gap-1">
                <Info className="w-3 h-3" />
                同类型多条独立证据
              </span>
            </h3>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {analysis.multiEvidenceGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-400">
                暂许多证据支持组
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analysis.multiEvidenceGroups.map((group) => {
                  const fragmentCodes = group.fragmentPair
                    .map((id) => fragments.find((f) => f.id === id)?.code || id)
                    .join(' ↔ ');
                  const evidenceType = group.relations[0]?.type;
                  const typeColor = evidenceType ? RelationTypeColors[evidenceType] : '#78716C';
                  const typeLabel = evidenceType ? RelationTypeLabels[evidenceType] : '未知';

                  return (
                    <div key={group.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-stone-700 flex items-center gap-2">
                          {fragmentCodes}
                          <span
                            className="px-1.5 py-0.5 text-xs rounded font-medium"
                            style={{
                              backgroundColor: `${typeColor}20`,
                              color: typeColor
                            }}
                          >
                            {typeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            {group.relations.length} 条证据
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            平均 {group.avgConfidence}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-emerald-300">
                        {group.relations.map((relation) => {
                          const source = fragments.find((f) => f.id === relation.sourceId);
                          const target = fragments.find((f) => f.id === relation.targetId);

                          return (
                            <div
                              key={relation.id}
                              className="text-xs flex items-center gap-2 cursor-pointer hover:bg-emerald-50 p-1 rounded transition-colors"
                              onClick={() => handleRelationClick(relation.id)}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: typeColor }}
                              />
                              <span className="text-stone-600">
                                {source?.code}—{target?.code}
                              </span>
                              <span
                                className="ml-auto font-bold"
                                style={{ color: typeColor }}
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

        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              高可信组合
              <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                ≥80%
              </span>
              {analysis.highConfidenceGroups.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                  {analysis.highConfidenceGroups.length} 个组合
                </span>
              )}
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
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
                  const groupedCount = groupFragments.filter((f) => f!.isGrouped).length;
                  const allGrouped = groupedCount === groupFragments.length && groupFragments.length > 0;

                  return (
                    <div key={group.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-stone-700 flex items-center gap-2">
                          组合 #{groupIndex + 1}
                          {allGrouped ? (
                            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              已定组
                            </span>
                          ) : groupedCount > 0 ? (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                              部分已定组 ({groupedCount}/{groupFragments.length})
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                            {group.fragmentIds.length} 块残片
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                            {group.relations.length} 条关系
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {groupFragments.map((frag) => (
                          <span
                            key={frag!.id}
                            className={`
                              text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors
                              ${frag!.isGrouped
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }
                            `}
                            onClick={() => handleFragmentClick(frag!.id)}
                            title={frag!.isGrouped ? '已定组' : '未分组'}
                          >
                            {frag!.code}
                            {frag!.isGrouped && ' ✓'}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-stone-500">
                          平均可信度: <span className="font-semibold text-amber-600">{group.avgConfidence}%</span>
                        </span>
                        <span className="text-stone-500">
                          最低: <span className="font-semibold text-amber-600">{group.minConfidence}%</span>
                        </span>
                      </div>

                      <div className="space-y-1 pl-2 border-l-2 border-amber-200">
                        {group.relations.map((relation) => {
                          const source = fragments.find((f) => f.id === relation.sourceId);
                          const target = fragments.find((f) => f.id === relation.targetId);
                          const color = RelationTypeColors[relation.type];

                          return (
                            <div
                              key={relation.id}
                              className="text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-50 p-1 rounded transition-colors"
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
