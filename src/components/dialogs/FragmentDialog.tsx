import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import { validateFragmentCode, validateGrouping } from '@/utils/validation';
import { getConflictingRelationGroups } from '@/utils/analysis';
import { Fragment } from '@/types';

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
  const { fragments, relations, addFragment, updateFragment, toggleGrouped } = useStore();

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
    ? validateGrouping(
        editFragmentId!,
        relations,
        getConflictingRelationGroups(relations)
      ).valid || editFragment.isGrouped
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-stone-700">
                  定组状态
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {canGroup
                    ? '可以标记为已定组'
                    : '存在冲突关系时不能标记为已定组'}
                </div>
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
          </div>
        )}
      </form>
    </Dialog>
  );
}
