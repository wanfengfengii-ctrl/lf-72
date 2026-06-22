import { useMemo, useState } from 'react';
import {
  GitCompare,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
  Layers,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import { Fragment, Relation, VersionDiff, RelationTypeLabels, RelationTypeColors } from '@/types';

interface VersionCompareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionA: number;
  versionB: number;
}

function DiffBadge({ type }: { type: 'add' | 'remove' | 'modify' }) {
  const config = {
    add: { Icon: Plus, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '新增' },
    remove: { Icon: Minus, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '删除' },
    modify: { Icon: Edit3, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '修改' }
  };
  const c = config[type];
  const Icon = c.Icon;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function FragmentDisplay({ fragment }: { fragment: Fragment }) {
  return (
    <div className="text-xs bg-white border border-stone-200 rounded p-2 space-y-1">
      <div className="flex items-center gap-2">
        <Layers className="w-3 h-3 text-amber-600" />
        <span className="font-semibold text-stone-800">{fragment.code}</span>
        <span className="text-stone-500">{fragment.name}</span>
        {fragment.isGrouped && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">
            已定组
          </span>
        )}
      </div>
      {fragment.notes && (
        <div className="text-[11px] text-stone-500 pl-5 truncate">{fragment.notes}</div>
      )}
    </div>
  );
}

function RelationDisplay({ relation, fragmentsMap }: { relation: Relation; fragmentsMap: Map<string, Fragment> }) {
  const source = fragmentsMap.get(relation.sourceId);
  const target = fragmentsMap.get(relation.targetId);
  const color = RelationTypeColors[relation.type];
  return (
    <div className="text-xs bg-white border border-stone-200 rounded p-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <LinkIcon className="w-3 h-3 text-emerald-600" />
        <span className="text-stone-700">
          {source?.code || relation.sourceId} ↔ {target?.code || relation.targetId}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {RelationTypeLabels[relation.type]}
        </span>
        <span
          className="text-[10px] font-bold"
          style={{ color }}
        >
          {relation.confidence}%
        </span>
      </div>
      {relation.notes && (
        <div className="text-[11px] text-stone-500 pl-5 truncate">{relation.notes}</div>
      )}
    </div>
  );
}

export default function VersionCompareDialog({
  isOpen,
  onClose,
  versionA,
  versionB
}: VersionCompareDialogProps) {
  const { compareVersions, getSnapshotByVersion, restoreVersion, fragments } = useStore();
  const [expandedSection, setExpandedSection] = useState<string | null>('all');
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  const diff = useMemo((): VersionDiff | null => {
    if (!isOpen) return null;
    if (versionA === versionB) return null;
    const v1 = Math.min(versionA, versionB);
    const v2 = Math.max(versionA, versionB);
    return compareVersions(v1, v2);
  }, [isOpen, versionA, versionB, compareVersions]);

  const v1 = Math.min(versionA, versionB);
  const v2 = Math.max(versionA, versionB);

  const snapA = getSnapshotByVersion(v1);
  const snapB = getSnapshotByVersion(v2);

  const allFragmentsMap = useMemo(() => {
    const map = new Map<string, Fragment>();
    if (snapA) snapA.fragments.forEach((f) => map.set(f.id, f));
    if (snapB) snapB.fragments.forEach((f) => map.set(f.id, f));
    fragments.forEach((f) => map.set(f.id, f));
    return map;
  }, [snapA, snapB, fragments]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleRestoreV1 = () => {
    restoreVersion(v1);
    onClose();
  };

  const handleRestoreV2 = () => {
    restoreVersion(v2);
    onClose();
  };

  const sections = useMemo(() => {
    if (!diff) return [];
    return [
      {
        id: 'fragments-added',
        title: '新增残片',
        count: diff.fragmentsAdded.length,
        emptyText: '无新增残片',
        color: 'green',
        items: diff.fragmentsAdded.map((f) => (
          <div key={f.id} className="space-y-1">
            <DiffBadge type="add" />
            <FragmentDisplay fragment={f} />
          </div>
        ))
      },
      {
        id: 'fragments-removed',
        title: '删除残片',
        count: diff.fragmentsRemoved.length,
        emptyText: '无删除残片',
        color: 'red',
        items: diff.fragmentsRemoved.map((f) => (
          <div key={f.id} className="space-y-1">
            <DiffBadge type="remove" />
            <FragmentDisplay fragment={f} />
          </div>
        ))
      },
      {
        id: 'fragments-modified',
        title: '修改残片',
        count: diff.fragmentsModified.length,
        emptyText: '无修改残片',
        color: 'amber',
        items: diff.fragmentsModified.map(({ old, changes, new: newFrag }) => (
          <div key={old.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <DiffBadge type="modify" />
              <span className="text-xs font-semibold text-stone-700">{old.code}</span>
            </div>
            <div className="space-y-1 pl-4 border-l-2 border-amber-200">
              {changes.map((c, i) => (
                <div key={i} className="text-[11px] flex items-center gap-2 bg-stone-50 rounded p-1.5">
                  <span className="text-stone-500 font-medium min-w-[60px]">{c.label}:</span>
                  <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded max-w-[100px] truncate">
                    {String(c.oldValue) || '(空)'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded max-w-[100px] truncate">
                    {String(c.newValue) || '(空)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      },
      {
        id: 'relations-added',
        title: '新增缀合关系',
        count: diff.relationsAdded.length,
        emptyText: '无新增缀合关系',
        color: 'green',
        items: diff.relationsAdded.map((r) => (
          <div key={r.id} className="space-y-1">
            <DiffBadge type="add" />
            <RelationDisplay relation={r} fragmentsMap={allFragmentsMap} />
          </div>
        ))
      },
      {
        id: 'relations-removed',
        title: '删除缀合关系',
        count: diff.relationsRemoved.length,
        emptyText: '无删除缀合关系',
        color: 'red',
        items: diff.relationsRemoved.map((r) => (
          <div key={r.id} className="space-y-1">
            <DiffBadge type="remove" />
            <RelationDisplay relation={r} fragmentsMap={allFragmentsMap} />
          </div>
        ))
      },
      {
        id: 'relations-modified',
        title: '修改缀合关系',
        count: diff.relationsModified.length,
        emptyText: '无修改缀合关系',
        color: 'amber',
        items: diff.relationsModified.map(({ old, changes }) => (
          <div key={old.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <DiffBadge type="modify" />
              <RelationDisplay relation={old} fragmentsMap={allFragmentsMap} />
            </div>
            <div className="space-y-1 pl-4 border-l-2 border-amber-200">
              {changes.map((c, i) => (
                <div key={i} className="text-[11px] flex items-center gap-2 bg-stone-50 rounded p-1.5">
                  <span className="text-stone-500 font-medium min-w-[60px]">{c.label}:</span>
                  <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded max-w-[100px] truncate">
                    {String(c.oldValue) || '(空)'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                  <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded max-w-[100px] truncate">
                    {String(c.newValue) || '(空)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      }
    ];
  }, [diff, allFragmentsMap]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="版本对比"
      size="lg"
    >
      {!diff ? (
        <div className="py-12 text-center text-stone-500">
          无法生成对比结果
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex-1 text-center">
              <div className="text-[10px] text-stone-500 mb-1">版本 A</div>
              <div className="text-2xl font-bold text-stone-800 mb-1">v{v1}</div>
              <div className="text-[11px] text-stone-500 mb-2">
                {snapA ? new Date(snapA.timestamp).toLocaleString('zh-CN') : ''}
              </div>
              <button
                onClick={() => setRestoreConfirm(true)}
                className="text-[11px] px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded flex items-center gap-1 mx-auto transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                恢复到此版本
              </button>
            </div>
            <div className="flex flex-col items-center">
              <GitCompare className="w-6 h-6 text-indigo-500" />
              <div className="text-[10px] text-stone-400 mt-1">对比</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-[10px] text-stone-500 mb-1">版本 B</div>
              <div className="text-2xl font-bold text-indigo-700 mb-1">v{v2}</div>
              <div className="text-[11px] text-stone-500 mb-2">
                {snapB ? new Date(snapB.timestamp).toLocaleString('zh-CN') : ''}
              </div>
              <button
                onClick={handleRestoreV2}
                className="text-[11px] px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded flex items-center gap-1 mx-auto transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                恢复到此版本
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-stone-800">{diff.summary.totalChanges}</div>
              <div className="text-[10px] text-stone-500 flex items-center justify-center gap-1">
                <BarChart3 className="w-3 h-3" />
                总变更数
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-green-700">
                {diff.fragmentsAdded.length + diff.relationsAdded.length}
              </div>
              <div className="text-[10px] text-green-600 flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" />
                新增
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-red-700">
                {diff.fragmentsRemoved.length + diff.relationsRemoved.length}
              </div>
              <div className="text-[10px] text-red-600 flex items-center justify-center gap-1">
                <Minus className="w-3 h-3" />
                删除
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-amber-700">
                {diff.fragmentsModified.length + diff.relationsModified.length}
              </div>
              <div className="text-[10px] text-amber-600 flex items-center justify-center gap-1">
                <Edit3 className="w-3 h-3" />
                修改
              </div>
            </div>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            {sections.map((section) => (
              <div key={section.id} className="border-b border-stone-100 last:border-b-0">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-white hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSection === section.id ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                    <span className="text-sm font-medium text-stone-800">{section.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      section.count > 0
                        ? section.color === 'green'
                          ? 'bg-green-100 text-green-700'
                          : section.color === 'red'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {section.count}
                    </span>
                  </div>
                </button>
                {expandedSection === section.id && (
                  <div className="px-4 pb-3 space-y-2 bg-stone-50/50">
                    {section.items.length === 0 ? (
                      <div className="text-xs text-stone-400 py-2 text-center italic">
                        {section.emptyText}
                      </div>
                    ) : (
                      section.items
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {diff.summary.fragmentChanges > 0 && (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="text-center text-stone-500">
                <span className="font-semibold text-stone-700">残片变更:</span>{' '}
                {diff.summary.fragmentChanges} 项
              </div>
              <div className="text-center text-stone-500">
                <span className="font-semibold text-stone-700">关系变更:</span>{' '}
                {diff.summary.relationChanges} 项
              </div>
              <div className="text-center text-stone-500">
                <span className="font-semibold text-stone-700">合计:</span>{' '}
                {diff.summary.totalChanges} 项
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        isOpen={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        title={`恢复到版本 v${v1}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            确定要恢复到版本 v{v1} 吗？此操作将创建新版本并保留所有历史记录。
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRestoreConfirm(false)}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-md"
            >
              取消
            </button>
            <button
              onClick={handleRestoreV1}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700"
            >
              确认恢复
            </button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
