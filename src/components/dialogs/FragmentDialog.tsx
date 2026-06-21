import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle as XCircle2
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import { validateFragmentCode } from '@/utils/validation';
import { getFragmentRelations, HIGH_CONFIDENCE_THRESHOLD, MIN_GROUPING_CONFIDENCE } from '@/utils/analysis';
import { Fragment, GroupingValidationResult } from '@/types';

interface FragmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editFragmentId?: string | null;
}

export default function FragmentDialog({
  isOpen,
  onClose,
  editFragmentId
}: FragmentDialogProps) {
  const { fragments, relations, addFragment, updateFragment, toggleGrouped, validateGroupingForFragment } = useStore();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    era: '',
    location: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');

  const isEditing = !!editFragmentId;
  const editFragment = fragments.find((f) => f.id === editFragmentId);

  useEffect(() => {
    if (editFragment) {
      setFormData({
        code: editFragment.code,
        name: editFragment.name,
        description: editFragment.description,
        era: editFragment.era || '',
        location: editFragment.location || '',
        notes: editFragment.notes || ''
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        era: '',
        location: '',
        notes: ''
      });
    }
    setError('');
    setCodeError('');
  }, [editFragment, isOpen]);

  const groupingValidation: GroupingValidationResult | null = useMemo(() => {
    if (!isEditing || !editFragmentId) return null;
    return validateGroupingForFragment(editFragmentId);
  }, [isEditing, editFragmentId, fragments, relations, validateGroupingForFragment]);

  const fragmentRelations = useMemo(() => {
    if (!editFragmentId) return [];
    return getFragmentRelations(editFragmentId, relations);
  }, [editFragmentId, relations]);

  const handleCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, code: value }));
    const validation = validateFragmentCode(value, fragments, editFragmentId || undefined);
    setCodeError(validation.valid ? '' : validation.message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const codeValidation = validateFragmentCode(
      formData.code,
      fragments,
      editFragmentId || undefined
    );
    if (!codeValidation.valid) {
      setError(codeValidation.message);
      return;
    }

    if (!formData.name.trim()) {
      setError('残片名称不能为空');
      return;
    }

    let result;
    if (isEditing && editFragmentId) {
      result = updateFragment(editFragmentId, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        era: formData.era.trim() || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined
      });
    } else {
      result = addFragment({
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        era: formData.era.trim() || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined
      });
    }

    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  const handleToggleGroup = () => {
    if (!editFragmentId || !editFragment) return;

    const result = toggleGrouped(editFragmentId);
    if (!result.success) {
      setError(result.message);
    }
  };

  const canGroup = isEditing && editFragment
    ? (groupingValidation?.valid ?? false) || editFragment.isGrouped
    : false;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑残片' : '添加残片'}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="fragment-form"
            className="px-4 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            {isEditing ? '保存修改' : '添加残片'}
          </button>
        </div>
      }
    >
      <form id="fragment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              残片编号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                codeError ? 'border-red-300 bg-red-50' : 'border-stone-300'
              }`}
              placeholder="如：甲001"
            />
            {codeError && (
              <p className="mt-1 text-xs text-red-500">{codeError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              残片名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="如：龟甲残片一"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            placeholder="描述残片的基本情况..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              时期
            </label>
            <input
              type="text"
              value={formData.era}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, era: e.target.value }))
              }
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="如：商代晚期"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              出土地点
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="如：河南安阳殷墟"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            备注
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            placeholder="其他备注信息..."
          />
        </div>

        {isEditing && editFragment && (
          <div className="pt-4 border-t border-stone-200">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-stone-700">
                定组状态
              </h4>
              <Info className="w-3.5 h-3.5 text-stone-400" />
            </div>

            {groupingValidation?.details && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`p-2 rounded-lg flex items-center gap-2 text-xs ${
                  groupingValidation.details.hasRelations
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {groupingValidation.details.hasRelations ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    缀合关系: {groupingValidation.details.relationCount} 条
                    {!groupingValidation.details.hasRelations && ' (至少需要 1 条)'}
                  </span>
                </div>

                <div className={`p-2 rounded-lg flex items-center gap-2 text-xs ${
                  !groupingValidation.details.hasConflicts
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {!groupingValidation.details.hasConflicts ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {!groupingValidation.details.hasConflicts
                      ? '无冲突关系'
                      : `存在 ${groupingValidation.details.conflictDetails.length} 组冲突`}
                  </span>
                </div>

                <div className={`p-2 rounded-lg flex items-center gap-2 text-xs ${
                  groupingValidation.details.hasHighConfidenceRelations
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {groupingValidation.details.hasHighConfidenceRelations ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    高可信关系 (≥{HIGH_CONFIDENCE_THRESHOLD}%): {groupingValidation.details.highConfidenceCount} 条
                  </span>
                </div>

                <div className={`p-2 rounded-lg flex items-center gap-2 text-xs ${
                  groupingValidation.details.minConfidenceOk
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {groupingValidation.details.minConfidenceOk ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    最低可信度: {groupingValidation.details.minConfidenceValue}%
                    {!groupingValidation.details.minConfidenceOk &&
                      ` (建议 ≥${MIN_GROUPING_CONFIDENCE}%)`}
                  </span>
                </div>
              </div>
            )}

            {groupingValidation?.details?.conflictDetails &&
              groupingValidation.details.conflictDetails.length > 0 && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-red-700 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    冲突详情（需解决后方可定组）：
                  </div>
                  <ul className="space-y-1">
                    {groupingValidation.details.conflictDetails.map((detail, i) => (
                      <li key={i} className="text-xs text-red-600 list-disc list-inside">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {groupingValidation?.warnings && groupingValidation.warnings.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  定组建议（{groupingValidation.warnings.length} 条）：
                </div>
                <ul className="space-y-1">
                  {groupingValidation.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-amber-700 list-disc list-inside">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">
                {editFragment.isGrouped
                  ? '该残片已标记为已定组，可点击取消'
                  : canGroup
                  ? groupingValidation?.message || '可以标记为已定组'
                  : groupingValidation?.message || '暂不满足定组条件'}
              </div>
              <button
                type="button"
                onClick={handleToggleGroup}
                disabled={!canGroup && !editFragment.isGrouped}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${editFragment.isGrouped
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : canGroup
                    ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }
                `}
              >
                {editFragment.isGrouped ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    已定组
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    标记为已定组
                  </>
                )}
              </button>
            </div>

            {fragmentRelations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <div className="text-xs font-medium text-stone-500 mb-2">
                  已建立的缀合关系（{fragmentRelations.length} 条）：
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {fragmentRelations.map((rel) => {
                    const otherId =
                      rel.sourceId === editFragmentId ? rel.targetId : rel.sourceId;
                    const other = fragments.find((f) => f.id === otherId);
                    return (
                      <div
                        key={rel.id}
                        className="text-xs text-stone-600 flex items-center justify-between px-2 py-1 bg-stone-50 rounded"
                      >
                        <span>↔ {other?.code || otherId}</span>
                        <span className="font-medium" style={{ opacity: rel.confidence / 100 + 0.3 }}>
                          {rel.confidence}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}
