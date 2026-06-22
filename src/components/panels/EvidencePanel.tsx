import { useMemo, useState } from 'react';
import {
  Image,
  Upload,
  Filter,
  Search,
  Trash2,
  ZoomIn,
  FileText,
  Layers,
  Calendar,
  User,
  Tag,
  X,
  Box,
  FileImage,
  GitCompare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  EvidenceAttachment,
  EvidenceAttachmentType,
  EvidenceAttachmentTypeLabels,
  EvidenceAttachmentTypeColors,
  AttachmentTargetType,
  EvidenceFilter
} from '@/types';

interface EvidencePanelProps {
  onViewEvidence: (attachment: EvidenceAttachment) => void;
  onUploadEvidence: () => void;
  onStartCompare?: (attachment: EvidenceAttachment) => void;
  targetType?: AttachmentTargetType;
  targetId?: string;
}

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
      minute: '2-digit'
    })
  };
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getTypeIcon = (type: EvidenceAttachmentType) => {
  switch (type) {
    case EvidenceAttachmentType.HD_IMAGE:
      return Image;
    case EvidenceAttachmentType.RUBBING:
      return FileImage;
    case EvidenceAttachmentType.MODEL_3D_SCREENSHOT:
      return Box;
    case EvidenceAttachmentType.COMPARISON_MARKUP:
      return GitCompare;
    default:
      return FileText;
  }
};

export default function EvidencePanel({
  onViewEvidence,
  onUploadEvidence,
  onStartCompare,
  targetType,
  targetId
}: EvidencePanelProps) {
  const {
    evidenceFilter,
    setEvidenceFilter,
    clearEvidenceFilter,
    getFilteredEvidence,
    deleteEvidenceAttachment,
    researchers
  } = useStore();

  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<EvidenceAttachmentType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredEvidence = useMemo(() => {
    let list = getFilteredEvidence();

    if (targetType) {
      list = list.filter((e) => e.targetType === targetType);
    }
    if (targetId) {
      list = list.filter((e) => e.targetId === targetId);
    }

    if (searchText.trim()) {
      const s = searchText.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          e.description.toLowerCase().includes(s) ||
          e.fileName.toLowerCase().includes(s)
      );
    }

    return list;
  }, [getFilteredEvidence, targetType, targetId, searchText]);

  const groupedEvidence = useMemo(() => {
    const groups: Partial<Record<EvidenceAttachmentType, EvidenceAttachment[]>> = {};
    for (const attachment of filteredEvidence) {
      if (!groups[attachment.type]) {
        groups[attachment.type] = [];
      }
      groups[attachment.type]!.push(attachment);
    }
    return groups;
  }, [filteredEvidence]);

  const uniqueUploaders = useMemo(() => {
    const names = new Set<string>();
    for (const e of filteredEvidence) {
      names.add(e.uploadedBy);
    }
    return Array.from(names);
  }, [filteredEvidence]);

  const stats = useMemo(
    () => ({
      total: filteredEvidence.length,
      hdImage: filteredEvidence.filter((e) => e.type === EvidenceAttachmentType.HD_IMAGE).length,
      rubbing: filteredEvidence.filter((e) => e.type === EvidenceAttachmentType.RUBBING).length,
      model3d: filteredEvidence.filter((e) => e.type === EvidenceAttachmentType.MODEL_3D_SCREENSHOT).length,
      markup: filteredEvidence.filter((e) => e.type === EvidenceAttachmentType.COMPARISON_MARKUP).length,
      other: filteredEvidence.filter((e) => e.type === EvidenceAttachmentType.OTHER).length
    }),
    [filteredEvidence]
  );

  const handleToggleFilterType = (type: EvidenceAttachmentType) => {
    const current = evidenceFilter.attachmentTypes ?? [];
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    setEvidenceFilter({ attachmentTypes: next.length > 0 ? next : undefined });
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteEvidenceAttachment(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const hasActiveFilters =
    (evidenceFilter.attachmentTypes && evidenceFilter.attachmentTypes.length > 0) ||
    evidenceFilter.uploadedBy ||
    evidenceFilter.dateFrom ||
    evidenceFilter.dateTo;

  const typeOrder: EvidenceAttachmentType[] = [
    EvidenceAttachmentType.HD_IMAGE,
    EvidenceAttachmentType.RUBBING,
    EvidenceAttachmentType.MODEL_3D_SCREENSHOT,
    EvidenceAttachmentType.COMPARISON_MARKUP,
    EvidenceAttachmentType.OTHER
  ];

  return (
    <div className="flex flex-col h-full bg-stone-50 border-l border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            证据附件管理
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onUploadEvidence}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              上传证据
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-stone-100 text-stone-500'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {targetType && targetId && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-800">
              当前筛选：{targetType === AttachmentTargetType.FRAGMENT ? '残片' : targetType === AttachmentTargetType.RELATION ? '缀合关系' : '评议'}
              {' '}- ID: {targetId.slice(0, 8)}...
            </span>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5">
          <div className="bg-blue-50 rounded-md p-2 border border-blue-100 text-center">
            <div className="text-[10px] text-blue-600 mb-0.5">高清图</div>
            <div className="text-sm font-bold text-blue-700">{stats.hdImage}</div>
          </div>
          <div className="bg-amber-50 rounded-md p-2 border border-amber-100 text-center">
            <div className="text-[10px] text-amber-700 mb-0.5">拓片</div>
            <div className="text-sm font-bold text-amber-800">{stats.rubbing}</div>
          </div>
          <div className="bg-purple-50 rounded-md p-2 border border-purple-100 text-center">
            <div className="text-[10px] text-purple-600 mb-0.5">3D截图</div>
            <div className="text-sm font-bold text-purple-700">{stats.model3d}</div>
          </div>
          <div className="bg-emerald-50 rounded-md p-2 border border-emerald-100 text-center">
            <div className="text-[10px] text-emerald-600 mb-0.5">标注图</div>
            <div className="text-sm font-bold text-emerald-700">{stats.markup}</div>
          </div>
          <div className="bg-stone-100 rounded-md p-2 border border-stone-200 text-center">
            <div className="text-[10px] text-stone-500 mb-0.5">其他</div>
            <div className="text-sm font-bold text-stone-700">{stats.other}</div>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索标题、描述、文件名..."
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

        {showFilters && (
          <div className="bg-stone-50 border border-stone-200 rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">筛选条件</span>
              <button
                onClick={() => {
                  clearEvidenceFilter();
                }}
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                清除全部
              </button>
            </div>

            <div>
              <div className="text-[10px] text-stone-500 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                证据类型
              </div>
              <div className="flex flex-wrap gap-1.5">
                {typeOrder.map((type) => {
                  const isActive = evidenceFilter.attachmentTypes?.includes(type);
                  const color = EvidenceAttachmentTypeColors[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleToggleFilterType(type)}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                      style={isActive ? { backgroundColor: color } : {}}
                    >
                      {EvidenceAttachmentTypeLabels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-stone-500 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                上传者
              </div>
              <select
                value={evidenceFilter.uploadedBy ?? ''}
                onChange={(e) =>
                  setEvidenceFilter({ uploadedBy: e.target.value || undefined })
                }
                className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white"
              >
                <option value="">全部上传者</option>
                {uniqueUploaders.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {researchers
                  .filter((r) => !uniqueUploaders.includes(r.name))
                  .map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  起始日期
                </label>
                <input
                  type="date"
                  value={evidenceFilter.dateFrom?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    setEvidenceFilter({
                      dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })
                  }
                  className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  结束日期
                </label>
                <input
                  type="date"
                  value={evidenceFilter.dateTo?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    setEvidenceFilter({
                      dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined
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
        {filteredEvidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Image className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500 mb-1">暂无证据附件</p>
            <p className="text-xs text-stone-400">点击右上角「上传证据」添加附件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {typeOrder.map((type) => {
              const items = groupedEvidence[type];
              if (!items || items.length === 0) return null;

              const color = EvidenceAttachmentTypeColors[type];
              const TypeIcon = getTypeIcon(type);
              const isExpanded = expandedGroup === type || expandedGroup === null;

              return (
                <div key={type} className="space-y-2">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? type : null)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <TypeIcon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="text-sm font-semibold text-stone-700">
                        {EvidenceAttachmentTypeLabels[type]}
                      </span>
                      <span
                        className="px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {items.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-stone-400 group-hover:text-stone-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-stone-600" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-1 gap-2">
                      {items.map((attachment) => {
                        const { date, time } = formatDateTime(attachment.createdAt);
                        const researcher = researchers.find(
                          (r) => r.id === attachment.uploadedByResearcherId
                        );

                        return (
                          <div
                            key={attachment.id}
                            className="bg-white rounded-lg border border-stone-200 overflow-hidden hover:border-stone-300 transition-all group"
                          >
                            <div className="flex gap-3 p-3">
                              <div
                                className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                onClick={() => onViewEvidence(attachment)}
                              >
                                {attachment.thumbnailUrl ? (
                                  <img
                                    src={attachment.thumbnailUrl}
                                    alt={attachment.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: `${color}10` }}
                                  >
                                    <TypeIcon className="w-8 h-8" style={{ color }} />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="w-5 h-5 text-white" />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span
                                        className="px-1.5 py-0.5 text-[9px] font-medium text-white rounded flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        {EvidenceAttachmentTypeLabels[attachment.type]}
                                      </span>
                                      {attachment.markers.length > 0 && (
                                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded font-medium">
                                          {attachment.markers.length} 标注
                                        </span>
                                      )}
                                    </div>
                                    <h3
                                      className="text-sm font-medium text-stone-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                      onClick={() => onViewEvidence(attachment)}
                                      title={attachment.title}
                                    >
                                      {attachment.title}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {onStartCompare && (
                                      <button
                                        onClick={() => onStartCompare(attachment)}
                                        className="p-1 rounded hover:bg-indigo-50 text-stone-400 hover:text-indigo-600 transition-colors"
                                        title="开始比对"
                                      >
                                        <GitCompare className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onViewEvidence(attachment)}
                                      className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                                      title="查看详情"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(attachment.id)}
                                      className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                                      title="删除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {attachment.description && (
                                  <p
                                    className="text-xs text-stone-500 mb-1.5 line-clamp-1"
                                    title={attachment.description}
                                  >
                                    {attachment.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-[11px] text-stone-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {researcher?.name || attachment.uploadedBy}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {date} {time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {formatFileSize(attachment.fileSize)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">确认删除证据</h3>
                <p className="text-xs text-stone-500">此操作无法撤销</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 bg-stone-50 rounded p-2 border border-stone-200">
              删除后将从该残片/关系的证据列表中移除，操作会被记录到历史中。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
