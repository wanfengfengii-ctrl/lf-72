import { useState, useEffect, useRef, useMemo, useCallback, ChangeEvent, DragEvent } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileUp,
  X,
  Check,
  Tag,
  Layers,
  Link,
  AlertCircle,
  User,
  ChevronDown
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import {
  EvidenceAttachmentType,
  EvidenceAttachmentTypeLabels,
  EvidenceAttachmentTypeColors,
  AttachmentTargetType
} from '@/types';

const AttachmentTargetTypeLabels: Record<AttachmentTargetType, string> = {
  [AttachmentTargetType.RELATION]: '缀合关系',
  [AttachmentTargetType.REVIEW]: '评议',
  [AttachmentTargetType.FRAGMENT]: '残片'
};

interface EvidenceUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTargetType?: AttachmentTargetType;
  defaultTargetId?: string;
}

interface FilePreview {
  dataUrl: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
}

function generateThumbnail(dataUrl: string, maxSize: number = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function EvidenceUploadDialog({
  isOpen,
  onClose,
  defaultTargetType,
  defaultTargetId
}: EvidenceUploadDialogProps) {
  const {
    fragments,
    relations,
    reviews,
    researchers,
    currentResearcherId,
    addEvidenceAttachment
  } = useStore();

  const [evidenceType, setEvidenceType] = useState<EvidenceAttachmentType>(EvidenceAttachmentType.HD_IMAGE);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<AttachmentTargetType>(AttachmentTargetType.RELATION);
  const [targetId, setTargetId] = useState('');
  const [fragmentReferenceIds, setFragmentReferenceIds] = useState<string[]>([]);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fragmentDropdownOpen, setFragmentDropdownOpen] = useState(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  const currentResearcher = useMemo(
    () => researchers.find((r) => r.id === currentResearcherId),
    [researchers, currentResearcherId]
  );

  const targetOptions = useMemo(() => {
    if (targetType === AttachmentTargetType.FRAGMENT) {
      return fragments.map((f) => ({
        id: f.id,
        label: `[${f.code}] ${f.name}`
      }));
    } else if (targetType === AttachmentTargetType.RELATION) {
      return relations.map((r) => {
        const sf = fragments.find((f) => f.id === r.sourceId);
        const tf = fragments.find((f) => f.id === r.targetId);
        return {
          id: r.id,
          label: `[${sf?.code || '?'} ↔ ${tf?.code || '?'}]`
        };
      });
    } else {
      return reviews.map((r) => {
        const rel = relations.find((rel) => rel.id === r.relationId);
        const sf = fragments.find((f) => f.id === rel?.sourceId);
        const tf = fragments.find((f) => f.id === rel?.targetId);
        const reviewer = researchers.find((res) => res.id === r.reviewerId);
        return {
          id: r.id,
          label: `${reviewer?.name || r.reviewerId} 对 [${sf?.code || '?'} ↔ ${tf?.code || '?'}] 的评议`
        };
      });
    }
  }, [targetType, fragments, relations, reviews, researchers]);

  useEffect(() => {
    if (isOpen) {
      setEvidenceType(EvidenceAttachmentType.HD_IMAGE);
      setTitle('');
      setDescription('');
      setTargetType(defaultTargetType || AttachmentTargetType.RELATION);
      setTargetId(defaultTargetId || '');
      setFragmentReferenceIds([]);
      setFilePreview(null);
      setError('');
      setSuccess('');
      setFragmentDropdownOpen(false);
      setTargetDropdownOpen(false);
    }
  }, [isOpen, defaultTargetType, defaultTargetId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFragmentDropdownOpen(false);
      }
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const [thumbnail, dimensions] = await Promise.all([
        generateThumbnail(dataUrl),
        getImageDimensions(dataUrl)
      ]);
      setFilePreview({
        dataUrl,
        thumbnailUrl: thumbnail,
        name: file.name,
        size: file.size,
        type: file.type,
        width: dimensions.width,
        height: dimensions.height
      });
      if (!title.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
        setTitle(nameWithoutExt);
      }
    } catch (err) {
      setError('文件处理失败，请重试');
    }
  }, [title]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClearFile = () => {
    setFilePreview(null);
  };

  const handleFragmentReferenceToggle = (fragmentId: string) => {
    setFragmentReferenceIds((prev) =>
      prev.includes(fragmentId)
        ? prev.filter((id) => id !== fragmentId)
        : [...prev, fragmentId]
    );
  };

  const handleSubmit = () => {
    setError('');
    setSuccess('');

    if (!filePreview) {
      setError('请选择要上传的图片');
      return;
    }
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    if (!targetId) {
      setError('请选择关联目标');
      return;
    }

    const result = addEvidenceAttachment({
      targetType,
      targetId,
      type: evidenceType,
      title: title.trim(),
      description: description.trim(),
      fileName: filePreview.name,
      fileSize: filePreview.size,
      mimeType: filePreview.type,
      url: filePreview.dataUrl,
      thumbnailUrl: filePreview.thumbnailUrl,
      width: filePreview.width,
      height: filePreview.height,
      fragmentReferenceIds: fragmentReferenceIds.length > 0 ? fragmentReferenceIds : undefined
    });

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="上传证据附件"
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-stone-500 flex items-center gap-1">
            <User className="w-3 h-3" />
            当前身份：{currentResearcher?.name || currentResearcherId}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              上传
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-emerald-700">{success}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            <ImageIcon className="w-4 h-4 inline mr-1.5" />
            证据类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(EvidenceAttachmentType) as Array<keyof typeof EvidenceAttachmentType>).map((key) => {
              const type = EvidenceAttachmentType[key];
              const isActive = evidenceType === type;
              const color = EvidenceAttachmentTypeColors[type];
              return (
                <button
                  key={key}
                  onClick={() => setEvidenceType(type)}
                  className={`
                    p-2.5 rounded-lg border text-xs text-left transition-all
                    ${isActive
                      ? 'border-2'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: `${color}15`,
                    borderColor: color
                  } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Tag
                      className="w-3.5 h-3.5"
                      style={{ color: isActive ? color : undefined }}
                    />
                    <span
                      className="font-medium"
                      style={{ color: isActive ? color : undefined }}
                    >
                      {EvidenceAttachmentTypeLabels[type]}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto" style={{ color }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            <FileUp className="w-4 h-4 inline mr-1.5" />
            上传图片
          </label>
          {!filePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-stone-300 hover:border-indigo-400 hover:bg-stone-50'
                }
              `}
            >
              <Upload
                className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-stone-400'}`}
              />
              <p className="text-sm text-stone-600 mb-1">
                拖放图片到此处，或点击选择文件
              </p>
              <p className="text-xs text-stone-400">
                支持 JPG、PNG、WebP 等常见图片格式
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative border border-stone-200 rounded-lg overflow-hidden">
              <div className="aspect-video bg-stone-100 flex items-center justify-center">
                <img
                  src={filePreview.thumbnailUrl}
                  alt="预览"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-700 truncate max-w-xs">
                    {filePreview.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatFileSize(filePreview.size)}
                    {filePreview.width && filePreview.height && (
                      <span className="ml-2">
                        {filePreview.width} × {filePreview.height}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleClearFile}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入证据标题"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请输入证据描述信息（可选）"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            <Link className="w-4 h-4 inline mr-1.5" />
            关联目标
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              {([AttachmentTargetType.RELATION, AttachmentTargetType.REVIEW, AttachmentTargetType.FRAGMENT] as AttachmentTargetType[]).map((type) => {
                const isActive = targetType === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setTargetType(type);
                      setTargetId('');
                    }}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                      ${isActive
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }
                    `}
                  >
                    {AttachmentTargetTypeLabels[type]}
                  </button>
                );
              })}
            </div>

            <div ref={targetDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg bg-white text-left flex items-center justify-between hover:border-stone-300 transition-colors"
              >
                <span className={targetId ? 'text-stone-700' : 'text-stone-400'}>
                  {targetId
                    ? targetOptions.find((o) => o.id === targetId)?.label
                    : `请选择${AttachmentTargetTypeLabels[targetType]}`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {targetDropdownOpen && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {targetOptions.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-stone-400 text-center">
                      暂无可用目标
                    </div>
                  ) : (
                    targetOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setTargetId(option.id);
                          setTargetDropdownOpen(false);
                        }}
                        className={`
                          w-full px-3 py-2 text-sm text-left hover:bg-stone-50 transition-colors
                          ${targetId === option.id ? 'bg-indigo-50 text-indigo-700' : 'text-stone-700'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {targetId === option.id && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                          <span>{option.label}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            <Layers className="w-4 h-4 inline mr-1.5" />
            关联残片引用（可选，多选）
          </label>
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setFragmentDropdownOpen(!fragmentDropdownOpen)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg bg-white text-left flex items-center justify-between hover:border-stone-300 transition-colors min-h-[42px]"
            >
              <span className="flex flex-wrap gap-1 flex-1">
                {fragmentReferenceIds.length === 0 ? (
                  <span className="text-stone-400">选择关联的残片</span>
                ) : (
                  fragmentReferenceIds.map((id) => {
                    const frag = fragments.find((f) => f.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded"
                      >
                        {frag?.code || id}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFragmentReferenceToggle(id);
                          }}
                        />
                      </span>
                    );
                  })
                )}
              </span>
              <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ml-2 ${fragmentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {fragmentDropdownOpen && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {fragments.map((frag) => {
                  const isSelected = fragmentReferenceIds.includes(frag.id);
                  return (
                    <button
                      key={frag.id}
                      type="button"
                      onClick={() => handleFragmentReferenceToggle(frag.id)}
                      className={`
                        w-full px-3 py-2 text-sm text-left hover:bg-stone-50 transition-colors
                        ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-stone-700'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-stone-300'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="font-medium">[{frag.code}]</span>
                        <span className="text-stone-500">{frag.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
