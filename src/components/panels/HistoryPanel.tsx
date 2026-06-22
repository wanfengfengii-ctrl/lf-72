import { useMemo, useState } from 'react';
import {
  History,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GitCompare,
  Filter,
  X,
  Search,
  Calendar,
  MessageSquarePlus,
  Check,
  AlertCircle,
  FileText,
  Layers,
  Link as LinkIcon,
  Trash2,
  PlusSquare,
  Edit3,
  Tag,
  Star,
  GitBranch
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  OperationType,
  OperationTypeLabels,
  OperationTypeColors,
  OperationRecord,
  HistoryFilter
} from '@/types';
import Dialog from '@/components/common/Dialog';
import VersionCompareDialog from '@/components/dialogs/VersionCompareDialog';

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }),
    time: date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
};

const getOperationIcon = (type: OperationType) => {
  switch (type) {
    case OperationType.FRAGMENT_ADD:
    case OperationType.RELATION_ADD:
      return PlusSquare;
    case OperationType.FRAGMENT_UPDATE:
    case OperationType.RELATION_UPDATE:
      return Edit3;
    case OperationType.FRAGMENT_DELETE:
    case OperationType.RELATION_DELETE:
      return Trash2;
    case OperationType.FRAGMENT_GROUP_TOGGLE:
      return Tag;
    case OperationType.RELATION_CONFIDENCE_CHANGE:
      return Star;
    case OperationType.NOTES_UPDATE:
      return FileText;
    case OperationType.BATCH_OPERATION:
      return Layers;
    case OperationType.VERSION_RESTORE:
      return RotateCcw;
    default:
      return History;
  }
};

export default function HistoryPanel() {
  const {
    currentVersion,
    getFilteredHistory,
    history,
    historyFilter,
    setHistoryFilter,
    clearHistoryFilter,
    restoreVersion,
    addNoteToOperation,
    fragments,
    relations,
    selectFragment,
    selectRelation
  } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState<number | null>(null);
  const [compareVersionB, setCompareVersionB] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] = useState<number | null>(null);
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchText, setSearchText] = useState('');

  const filteredHistory = useMemo(() => {
    let list = getFilteredHistory();
    if (searchText.trim()) {
      const s = searchText.trim().toLowerCase();
      list = list.filter((r) =>
        r.description.toLowerCase().includes(s) ||
        r.operator.toLowerCase().includes(s) ||
        r.targets.some((t) =>
          (t.code && t.code.toLowerCase().includes(s)) ||
          (t.name && t.name.toLowerCase().includes(s))
        )
      );
    }
    return list;
  }, [getFilteredHistory, searchText]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRestore = (version: number) => {
    setRestoreConfirmVersion(version);
  };

  const confirmRestore = () => {
    if (restoreConfirmVersion != null) {
      restoreVersion(restoreConfirmVersion);
      setRestoreConfirmVersion(null);
    }
  };

  const handleStartCompare = (version: number) => {
    if (compareVersionA === null) {
      setCompareVersionA(version);
      setCompareMode(true);
    } else {
      setCompareVersionB(version);
      setCompareDialogOpen(true);
    }
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setCompareVersionA(null);
    setCompareVersionB(null);
  };

  const handleToggleFilterType = (type: OperationType) => {
    const current = historyFilter.operationTypes ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setHistoryFilter({ operationTypes: next.length > 0 ? next : undefined });
  };

  const handleNoteEdit = (record: OperationRecord) => {
    setNoteEditingId(record.id);
    setNoteText(record.note || '');
  };

  const handleNoteSave = (recordId: string) => {
    addNoteToOperation(recordId, noteText);
    setNoteEditingId(null);
    setNoteText('');
  };

  const handleTargetClick = (record: OperationRecord) => {
    for (const t of record.targets) {
      if (t.type === 'fragment' && t.id) {
        const frag = fragments.find((f) => f.id === t.id);
        if (frag) {
          selectFragment(t.id);
          return;
        }
      }
      if (t.type === 'relation' && t.id) {
        const rel = relations.find((r) => r.id === t.id);
        if (rel) {
          selectRelation(t.id);
          return;
        }
      }
    }
  };

  const stats = useMemo(() => ({
    total: history.length,
    today: history.filter((r) => {
      const today = new Date().toDateString();
      return new Date(r.timestamp).toDateString() === today;
    }).length,
    fragmentsOp: history.filter((r) => r.targets.some((t) => t.type === 'fragment')).length,
    relationsOp: history.filter((r) => r.targets.some((t) => t.type === 'relation')).length
  }), [history]);

  return (
    <div className="flex flex-col h-full bg-stone-50 border-l border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            研究过程记录
          </h2>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full font-medium">
              v{currentVersion}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${
                showFilters || Object.keys(historyFilter).length > 0
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-stone-100 text-stone-500'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-50 rounded-md p-2 border border-stone-100">
            <div className="text-[10px] text-stone-500 mb-0.5">总操作数</div>
            <div className="text-sm font-bold text-stone-800">{stats.total}</div>
          </div>
          <div className="bg-stone-50 rounded-md p-2 border border-stone-100">
            <div className="text-[10px] text-stone-500 mb-0.5">今日操作</div>
            <div className="text-sm font-bold text-stone-800">{stats.today}</div>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索操作描述、残片编号..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded text-stone-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {compareMode && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md p-2.5 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="text-xs text-indigo-700 flex-1">
              已选择 <span className="font-bold">v{compareVersionA}</span>，请选择要对比的版本
            </div>
            <button
              onClick={handleCancelCompare}
              className="text-xs text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {showFilters && (
          <div className="bg-stone-50 border border-stone-200 rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">操作类型筛选</span>
              <button
                onClick={clearHistoryFilter}
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                清除
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(OperationType) as Array<keyof typeof OperationType>).map((key) => {
                const type = OperationType[key];
                const isActive = historyFilter.operationTypes?.includes(type);
                return (
                  <button
                    key={key}
                    onClick={() => handleToggleFilterType(type)}
                    className={`text-xs px-2 py-1 rounded border transition-all ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                    style={isActive ? { backgroundColor: OperationTypeColors[type] } : {}}
                  >
                    {OperationTypeLabels[type]}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 block mb-1">目标类型</label>
                <select
                  value={historyFilter.targetType ?? 'all'}
                  onChange={(e) =>
                    setHistoryFilter({
                      targetType: e.target.value === 'all' ? undefined : (e.target.value as 'fragment' | 'relation')
                    })
                  }
                  className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white"
                >
                  <option value="all">全部</option>
                  <option value="fragment">残片相关</option>
                  <option value="relation">关系相关</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 block mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  起始日期
                </label>
                <input
                  type="date"
                  value={historyFilter.dateFrom?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    setHistoryFilter({
                      dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })
                  }
                  className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500 mb-1">暂无操作记录</p>
            <p className="text-xs text-stone-400">对残片或关系进行操作后将在此显示</p>
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-stone-200" />

            {filteredHistory.map((record, index) => {
              const { date, time } = formatDateTime(record.timestamp);
              const isCurrent = record.version === currentVersion;
              const color = OperationTypeColors[record.type];
              const Icon = getOperationIcon(record.type);
              const isExpanded = expandedId === record.id;
              const isCompareSelected = compareVersionA === record.version;

              return (
                <div key={record.id} className="relative mb-4 last:mb-0">
                  <div
                    className={`absolute -left-4 top-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                      isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </div>

                  <div
                    className={`
                      bg-white rounded-lg border transition-all overflow-hidden
                      ${isCurrent ? 'border-indigo-300 shadow-sm' : 'border-stone-200 hover:border-stone-300'}
                      ${isCompareSelected ? 'ring-2 ring-indigo-500' : ''}
                    `}
                  >
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() => handleToggleExpand(record.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-medium text-white rounded flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {OperationTypeLabels[record.type]}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                            v{record.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                              当前
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      <p className="text-sm text-stone-700 mb-2 leading-snug">
                        {record.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {date} {time}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {record.operator}
                        </span>
                        {record.note && !isExpanded && (
                          <span className="flex items-center gap-1 text-indigo-600">
                            <FileText className="w-3 h-3" />
                            有备注
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-stone-100 bg-stone-50/50 p-3 space-y-3">
                        {record.targets.length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              操作目标
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {record.targets.map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleTargetClick(record)}
                                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                                    t.type === 'system'
                                      ? 'bg-stone-100 border-stone-200 text-stone-600'
                                      : t.type === 'fragment'
                                        ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  {t.type === 'fragment' && <Layers className="w-3 h-3 inline mr-1" />}
                                  {t.type === 'relation' && <LinkIcon className="w-3 h-3 inline mr-1" />}
                                  {t.code || t.name || (t.type === 'system' ? '系统' : t.id?.slice(0, 8))}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.changes.length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              变更详情
                            </div>
                            <div className="space-y-1.5">
                              {record.changes.map((c, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-white border border-stone-200 rounded p-2"
                                >
                                  <div className="text-stone-500 mb-1">{c.label || c.field}</div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {c.oldValue !== undefined && (
                                      <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[11px] max-w-[120px] truncate">
                                        {String(c.oldValue) || '(空)'}
                                      </span>
                                    )}
                                    <span className="text-stone-400">→</span>
                                    {c.newValue !== undefined && (
                                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[11px] max-w-[120px] truncate">
                                        {String(c.newValue) || '(空)'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {noteEditingId === record.id ? (
                          <div>
                            <div className="text-[10px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
                              <MessageSquarePlus className="w-3 h-3" />
                              学术备注
                            </div>
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="添加研究说明、讨论依据、判断理由..."
                              className="w-full text-xs p-2 border border-stone-200 rounded-md h-20 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setNoteEditingId(null);
                                  setNoteText('');
                                }}
                                className="text-xs px-3 py-1 text-stone-600 hover:bg-stone-100 rounded"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleNoteSave(record.id)}
                                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-semibold text-stone-500 flex items-center gap-1">
                                <MessageSquarePlus className="w-3 h-3" />
                                学术备注
                              </span>
                              <button
                                onClick={() => handleNoteEdit(record)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700"
                              >
                                {record.note ? '编辑' : '添加'}
                              </button>
                            </div>
                            {record.note ? (
                              <div className="text-xs bg-amber-50 border border-amber-200 border-dashed rounded-md p-2.5 text-amber-900 leading-relaxed whitespace-pre-wrap">
                                {record.note}
                              </div>
                            ) : (
                              <div className="text-xs text-stone-400 italic">
                                暂无备注，可添加研究说明和判断依据
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 border-t border-stone-200">
                          {!isCurrent && (
                            <button
                              onClick={() => handleRestore(record.version)}
                              className="flex-1 text-xs py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              恢复到此版本
                            </button>
                          )}
                          <button
                            onClick={() => handleStartCompare(record.version)}
                            className={`flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${
                              isCompareSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            {compareMode
                              ? isCompareSelected
                                ? '取消选择'
                                : `与 v${compareVersionA} 对比`
                              : '选为对比项A'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        isOpen={restoreConfirmVersion !== null}
        onClose={() => setRestoreConfirmVersion(null)}
        title="确认恢复版本"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  即将恢复到版本 v{restoreConfirmVersion}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  恢复操作将创建一个新的版本（v{currentVersion + 1}），包含所选版本的完整状态。
                  当前版本（v{currentVersion}）的所有历史记录将被保留，可随时再次切换。
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRestoreConfirmVersion(null)}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmRestore}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              确认恢复
            </button>
          </div>
        </div>
      </Dialog>

      <VersionCompareDialog
        isOpen={compareDialogOpen}
        onClose={() => {
          setCompareDialogOpen(false);
          handleCancelCompare();
        }}
        versionA={compareVersionA!}
        versionB={compareVersionB!}
      />
    </div>
  );
}
