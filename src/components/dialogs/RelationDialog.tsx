import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import { RelationType, RelationTypeLabels, RelationTypeColors } from '@/types';
import { validateAddRelation } from '@/utils/validation';

interface RelationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editRelationId?: string | null;
  defaultSourceId?: string | null;
  defaultTargetId?: string | null;
}

export default function RelationDialog({
  isOpen,
  onClose,
  editRelationId,
  defaultSourceId,
  defaultTargetId
}: RelationDialogProps) {
  const { fragments, relations, addRelation, updateRelation } = useStore();

  const [formData, setFormData] = useState({
    sourceId: '',
    targetId: '',
    type: RelationType.EDGE_MATCH,
    confidence: 50,
    notes: ''
  });
  const [error, setError] = useState('');

  const isEditing = !!editRelationId;
  const editRelation = relations.find((r) => r.id === editRelationId);

  useEffect(() => {
    if (editRelation) {
      setFormData({
        sourceId: editRelation.sourceId,
        targetId: editRelation.targetId,
        type: editRelation.type,
        confidence: editRelation.confidence,
        notes: editRelation.notes
      });
    } else {
      setFormData({
        sourceId: defaultSourceId || (fragments[0]?.id || ''),
        targetId: defaultTargetId || (fragments[1]?.id || ''),
        type: RelationType.EDGE_MATCH,
        confidence: 50,
        notes: ''
      });
    }
    setError('');
  }, [editRelation, isOpen, defaultSourceId, defaultTargetId, fragments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAddRelation(
      formData.sourceId,
      formData.targetId,
      formData.type,
      formData.confidence,
      formData.notes,
      relations,
      editRelationId || undefined
    );

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    let result;
    if (isEditing && editRelationId) {
      result = updateRelation(editRelationId, {
        sourceId: formData.sourceId,
        targetId: formData.targetId,
        type: formData.type,
        confidence: formData.confidence,
        notes: formData.notes
      });
    } else {
      result = addRelation({
        sourceId: formData.sourceId,
        targetId: formData.targetId,
        type: formData.type,
        confidence: formData.confidence,
        notes: formData.notes
      });
    }

    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  const sourceFragment = fragments.find((f) => f.id === formData.sourceId);
  const targetFragment = fragments.find((f) => f.id === formData.targetId);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑缀合关系' : '添加缀合关系'}
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
            form="relation-form"
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {isEditing ? '保存修改' : '添加关系'}
          </button>
        </div>
      }
    >
      <form id="relation-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              源残片 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.sourceId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sourceId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {fragments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              目标残片 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.targetId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, targetId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {fragments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sourceFragment && targetFragment && (
          <div className="flex items-center justify-center gap-3 p-3 bg-stone-50 rounded-lg">
            <span className="text-sm font-medium text-stone-700">
              {sourceFragment.code}
            </span>
            <span className="text-stone-400">↔</span>
            <span className="text-sm font-medium text-stone-700">
              {targetFragment.code}
            </span>
            {formData.sourceId === formData.targetId && (
              <span className="text-xs text-red-500 ml-2">
                不能与自身建立关系
              </span>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            依据类型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(RelationTypeLabels).map(([value, label]) => {
              const typeValue = value as RelationType;
              const color = RelationTypeColors[typeValue];
              const isSelected = formData.type === typeValue;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, type: typeValue }))
                  }
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    border-2
                    ${isSelected
                      ? 'border-current bg-opacity-10'
                      : 'border-transparent bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }
                  `}
                  style={{
                    color: isSelected ? color : undefined,
                    backgroundColor: isSelected ? `${color}15` : undefined,
                    borderColor: isSelected ? color : undefined
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-700">
              可信度 <span className="text-red-500">*</span>
            </label>
            <span
              className="text-sm font-bold px-2 py-0.5 rounded"
              style={{
                color: RelationTypeColors[formData.type],
                backgroundColor: `${RelationTypeColors[formData.type]}15`
              }}
            >
              {formData.confidence}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.confidence}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                confidence: Number(e.target.value)
              }))
            }
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
            style={{
              accentColor: RelationTypeColors[formData.type]
            }}
          />
          <div className="flex justify-between mt-1 text-xs text-stone-400">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
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
            rows={3}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            placeholder="添加缀合依据的详细说明..."
          />
        </div>
      </form>
    </Dialog>
  );
}
