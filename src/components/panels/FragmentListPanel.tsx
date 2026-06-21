import { useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Layers, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getFragmentRelations } from '@/utils/analysis';

interface FragmentListPanelProps {
  onAddFragment: () => void;
  onEditFragment: (id: string) => void;
  onDeleteFragment: (id: string) => void;
}

export default function FragmentListPanel({
  onAddFragment,
  onEditFragment,
  onDeleteFragment
}: FragmentListPanelProps) {
  const {
    fragments,
    relations,
    searchKeyword,
    setSearchKeyword,
    selectedFragmentId,
    selectFragment
  } = useStore();

  const filteredFragments = useMemo(() => {
    if (!searchKeyword.trim()) return fragments;
    const keyword = searchKeyword.toLowerCase();
    return fragments.filter(
      (f) =>
        f.code.toLowerCase().includes(keyword) ||
        f.name.toLowerCase().includes(keyword) ||
        f.description.toLowerCase().includes(keyword)
    );
  }, [fragments, searchKeyword]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-stone-200">
      <div className="p-4 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            残片列表
          </h2>
          <button
            onClick={onAddFragment}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="搜索残片编号或名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="mt-2 text-xs text-stone-500">
          共 {filteredFragments.length} 个残片
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFragments.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            暂无残片数据
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredFragments.map((fragment) => {
              const relationCount = getFragmentRelations(fragment.id, relations).length;
              const isSelected = fragment.id === selectedFragmentId;

              return (
                <div
                  key={fragment.id}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-amber-50 border-l-4 border-amber-500' 
                      : 'hover:bg-stone-50 border-l-4 border-transparent'
                    }
                  `}
                  onClick={() => selectFragment(fragment.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800 text-sm">
                          {fragment.code}
                        </span>
                        {fragment.isGrouped && (
                          <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            已定组
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-stone-600 truncate mt-0.5">
                        {fragment.name}
                      </div>
                      <div className="text-xs text-stone-400 mt-1">
                        {relationCount} 条缀合关系
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditFragment(fragment.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定要删除残片 "${fragment.code}" 吗？相关缀合关系也会被删除。`)) {
                            onDeleteFragment(fragment.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {fragment.description && (
                    <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                      {fragment.description}
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
