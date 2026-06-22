import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Eye,
  EyeOff,
  X,
  Check,
  Trash2,
  Columns,
  Image,
  Maximize2,
  Minimize2,
  Link2,
  Palette,
  RotateCcw,
  Edit3,
  Search,
  ChevronRight
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { EvidenceAttachment, AnnotationMarker } from '@/types';
import { useStore } from '@/store/useStore';

interface EvidenceViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attachment?: EvidenceAttachment | null;
  compareLeftId?: string;
  compareRightId?: string;
}

interface ViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface MagnifierState {
  visible: boolean;
  x: number;
  y: number;
}

const ANNOTATION_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316'
];

const DEFAULT_VIEW: ViewState = { scale: 1, translateX: 0, translateY: 0 };

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export default function EvidenceViewerDialog({
  isOpen,
  onClose,
  attachment,
  compareLeftId,
  compareRightId
}: EvidenceViewerDialogProps) {
  const { evidenceAttachments, addMarkerToAttachment, updateMarker, deleteMarker } = useStore();

  const isCompareMode = !!(compareLeftId && compareRightId);

  const leftAttachment = isCompareMode
    ? evidenceAttachments.find((a) => a.id === compareLeftId) || null
    : attachment || null;
  const rightAttachment = isCompareMode
    ? evidenceAttachments.find((a) => a.id === compareRightId) || null
    : null;

  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);
  const [syncZoom, setSyncZoom] = useState(true);
  const [syncPan, setSyncPan] = useState(true);
  const [linkingMarkerId, setLinkingMarkerId] = useState<string | null>(null);
  const [linkingSide, setLinkingSide] = useState<'left' | 'right' | null>(null);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);

  const [leftView, setLeftView] = useState<ViewState>(DEFAULT_VIEW);
  const [rightView, setRightView] = useState<ViewState>(DEFAULT_VIEW);
  const [leftMagnifier, setLeftMagnifier] = useState<MagnifierState>({ visible: false, x: 0, y: 0 });
  const [rightMagnifier, setRightMagnifier] = useState<MagnifierState>({ visible: false, x: 0, y: 0 });

  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const leftImageRef = useRef<HTMLImageElement>(null);
  const rightImageRef = useRef<HTMLImageElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });
  const drawingSideRef = useRef<'left' | 'right' | null>(null);

  const [editForm, setEditForm] = useState<{ label: string; color: string; description: string }>({
    label: '',
    color: ANNOTATION_COLORS[0],
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      setLeftView(DEFAULT_VIEW);
      setRightView(DEFAULT_VIEW);
      setShowAnnotations(true);
      setIsAddingAnnotation(false);
      setEditingMarkerId(null);
      setLinkingMarkerId(null);
    }
  }, [isOpen, attachment, compareLeftId, compareRightId]);

  const handleWheel = useCallback(
    (e: React.WheelEvent, side: 'left' | 'right') => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const setView = side === 'left' ? setLeftView : setRightView;
      const otherSetView = side === 'left' ? setRightView : setLeftView;

      setView((prev) => {
        const newScale = Math.max(0.2, Math.min(5, prev.scale + delta));
        return { ...prev, scale: newScale };
      });

      if (syncZoom && isCompareMode) {
        otherSetView((prev) => {
          const newScale = Math.max(0.2, Math.min(5, prev.scale + delta));
          return { ...prev, scale: newScale };
        });
      }
    },
    [syncZoom, isCompareMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      const containerRef = side === 'left' ? leftContainerRef : rightContainerRef;
      const view = side === 'left' ? leftView : rightView;

      if (isAddingAnnotation) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const imgNaturalWidth = (side === 'left' ? leftImageRef : rightImageRef).current?.naturalWidth || 1;
        const imgNaturalHeight = (side === 'left' ? leftImageRef : rightImageRef).current?.naturalHeight || 1;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        const scaleFit = Math.min(displayWidth / imgNaturalWidth, displayHeight / imgNaturalHeight);
        const imgDisplayW = imgNaturalWidth * scaleFit;
        const imgDisplayH = imgNaturalHeight * scaleFit;
        const offsetX = (displayWidth - imgDisplayW) / 2;
        const offsetY = (displayHeight - imgDisplayH) / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (
          mouseX >= offsetX &&
          mouseX <= offsetX + imgDisplayW &&
          mouseY >= offsetY &&
          mouseY <= offsetY + imgDisplayH
        ) {
          const relativeX = (mouseX - offsetX - view.translateX) / (scaleFit * view.scale);
          const relativeY = (mouseY - offsetY - view.translateY) / (scaleFit * view.scale);

          setIsDrawing(true);
          drawingSideRef.current = side;
          drawStartRef.current = { x: relativeX, y: relativeY };
          setDrawRect({ x: relativeX, y: relativeY, w: 0, h: 0 });
        }
        return;
      }

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: view.translateX,
        ty: view.translateY
      };
    },
    [isAddingAnnotation, leftView, rightView]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      const containerRef = side === 'left' ? leftContainerRef : rightContainerRef;

      if (isDrawing && drawingSideRef.current === side) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const imgNaturalWidth = (side === 'left' ? leftImageRef : rightImageRef).current?.naturalWidth || 1;
        const imgNaturalHeight = (side === 'left' ? leftImageRef : rightImageRef).current?.naturalHeight || 1;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        const scaleFit = Math.min(displayWidth / imgNaturalWidth, displayHeight / imgNaturalHeight);
        const view = side === 'left' ? leftView : rightView;
        const imgDisplayW = imgNaturalWidth * scaleFit;
        const imgDisplayH = imgNaturalHeight * scaleFit;
        const offsetX = (displayWidth - imgDisplayW) / 2;
        const offsetY = (displayHeight - imgDisplayH) / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const relativeX = (mouseX - offsetX - view.translateX) / (scaleFit * view.scale);
        const relativeY = (mouseY - offsetY - view.translateY) / (scaleFit * view.scale);

        setDrawRect({
          x: Math.min(drawStartRef.current.x, relativeX),
          y: Math.min(drawStartRef.current.y, relativeY),
          w: Math.abs(relativeX - drawStartRef.current.x),
          h: Math.abs(relativeY - drawStartRef.current.y)
        });
        return;
      }

      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const setView = side === 'left' ? setLeftView : setRightView;
        const otherSetView = side === 'left' ? setRightView : setLeftView;

        setView((prev) => ({
          ...prev,
          translateX: dragStartRef.current.tx + dx,
          translateY: dragStartRef.current.ty + dy
        }));

        if (syncPan && isCompareMode) {
          otherSetView((prev) => ({
            ...prev,
            translateX: dragStartRef.current.tx + dx,
            translateY: dragStartRef.current.ty + dy
          }));
        }
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const setMagnifier = side === 'left' ? setLeftMagnifier : setRightMagnifier;
        setMagnifier({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    },
    [isDrawing, isDragging, syncPan, isCompareMode, leftView, rightView]
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent, side: 'left' | 'right') => {
      if (isDrawing && drawingSideRef.current === side && drawRect && drawRect.w > 5 && drawRect.h > 5) {
        const targetAttachment = side === 'left' ? leftAttachment : rightAttachment;
        if (targetAttachment) {
          const newMarker: Omit<AnnotationMarker, 'id'> = {
            x: drawRect.x,
            y: drawRect.y,
            width: drawRect.w,
            height: drawRect.h,
            label: '新标注',
            color: ANNOTATION_COLORS[Math.floor(Math.random() * ANNOTATION_COLORS.length)],
            description: ''
          };
          addMarkerToAttachment(targetAttachment.id, newMarker);
        }
        setIsAddingAnnotation(false);
      }
      setIsDrawing(false);
      setDrawRect(null);
      drawingSideRef.current = null;
      setIsDragging(false);
    },
    [isDrawing, drawRect, leftAttachment, rightAttachment, addMarkerToAttachment]
  );

  const handleMouseLeave = useCallback((side: 'left' | 'right') => {
    const setMagnifier = side === 'left' ? setLeftMagnifier : setRightMagnifier;
    setMagnifier({ visible: false, x: 0, y: 0 });
    if (!isDrawing) {
      setIsDragging(false);
    }
  }, [isDrawing]);

  const handleZoom = (delta: number) => {
    setLeftView((prev) => {
      const newScale = Math.max(0.2, Math.min(5, prev.scale + delta));
      return { ...prev, scale: newScale };
    });
    if (isCompareMode && syncZoom) {
      setRightView((prev) => {
        const newScale = Math.max(0.2, Math.min(5, prev.scale + delta));
        return { ...prev, scale: newScale };
      });
    }
  };

  const handleReset = () => {
    setLeftView(DEFAULT_VIEW);
    if (isCompareMode) {
      setRightView(DEFAULT_VIEW);
    }
  };

  const handleStartEdit = (marker: AnnotationMarker, side: 'left' | 'right') => {
    setEditingMarkerId(marker.id);
    setEditingSide(side);
    setEditForm({
      label: marker.label,
      color: marker.color,
      description: marker.description || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editingMarkerId || !editingSide) return;
    const targetAttachment = editingSide === 'left' ? leftAttachment : rightAttachment;
    if (targetAttachment) {
      updateMarker(targetAttachment.id, editingMarkerId, {
        label: editForm.label,
        color: editForm.color,
        description: editForm.description
      });
    }
    setEditingMarkerId(null);
    setEditingSide(null);
  };

  const handleDeleteMarker = (markerId: string, side: 'left' | 'right') => {
    const targetAttachment = side === 'left' ? leftAttachment : rightAttachment;
    if (targetAttachment) {
      deleteMarker(targetAttachment.id, markerId);
      const currentMarkers = targetAttachment.markers || [];
      currentMarkers.forEach((m) => {
        if (m.linkedMarkerId === markerId) {
          updateMarker(targetAttachment.id, m.id, { linkedMarkerId: undefined });
        }
      });
    }
    setEditingMarkerId(null);
    setEditingSide(null);
  };

  const handleStartLink = (markerId: string, side: 'left' | 'right') => {
    setLinkingMarkerId(markerId);
    setLinkingSide(side);
  };

  const handleCompleteLink = (targetMarkerId: string, targetSide: 'left' | 'right') => {
    if (!linkingMarkerId || !linkingSide) return;
    if (linkingSide === targetSide) {
      setLinkingMarkerId(null);
      setLinkingSide(null);
      return;
    }

    const sourceAttachment = linkingSide === 'left' ? leftAttachment : rightAttachment;
    const targetAttachment = targetSide === 'left' ? leftAttachment : rightAttachment;

    if (sourceAttachment && targetAttachment) {
      updateMarker(sourceAttachment.id, linkingMarkerId, { linkedMarkerId: targetMarkerId });
      updateMarker(targetAttachment.id, targetMarkerId, { linkedMarkerId: linkingMarkerId });
    }

    setLinkingMarkerId(null);
    setLinkingSide(null);
  };

  const handleCancelLink = () => {
    setLinkingMarkerId(null);
    setLinkingSide(null);
  };

  const handleLocateMarker = (marker: AnnotationMarker, side: 'left' | 'right') => {
    const setView = side === 'left' ? setLeftView : setRightView;
    const containerRef = side === 'left' ? leftContainerRef : rightContainerRef;
    const imgRef = side === 'left' ? leftImageRef : rightImageRef;

    const rect = containerRef.current?.getBoundingClientRect();
    const imgNaturalWidth = imgRef.current?.naturalWidth || 1;
    const imgNaturalHeight = imgRef.current?.naturalHeight || 1;

    if (!rect) return;

    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const scaleFit = Math.min(displayWidth / imgNaturalWidth, displayHeight / imgNaturalHeight);

    const targetScale = 2;
    const centerX = marker.x + marker.width / 2;
    const centerY = marker.y + marker.height / 2;

    const imgDisplayW = imgNaturalWidth * scaleFit * targetScale;
    const imgDisplayH = imgNaturalHeight * scaleFit * targetScale;
    const offsetX = (displayWidth - imgDisplayW) / 2;
    const offsetY = (displayHeight - imgDisplayH) / 2;

    setView({
      scale: targetScale,
      translateX: offsetX - centerX * scaleFit * targetScale + displayWidth / 2,
      translateY: offsetY - centerY * scaleFit * targetScale + displayHeight / 2
    });

    setHighlightedMarkerId(marker.id);
    setTimeout(() => setHighlightedMarkerId(null), 2000);
  };

  const markersWithLinks = useMemo(() => {
    const left = leftAttachment?.markers || [];
    const right = rightAttachment?.markers || [];
    const linkPairs: Array<{ left: AnnotationMarker; right: AnnotationMarker }> = [];

    left.forEach((lm) => {
      if (lm.linkedMarkerId) {
        const rm = right.find((r) => r.id === lm.linkedMarkerId);
        if (rm) {
          linkPairs.push({ left: lm, right: rm });
        }
      }
    });

    return linkPairs;
  }, [leftAttachment, rightAttachment]);

  const renderImageCanvas = (
    att: EvidenceAttachment | null,
    view: ViewState,
    magnifier: MagnifierState,
    side: 'left' | 'right',
    containerRef: React.RefObject<HTMLDivElement>,
    imgRef: React.RefObject<HTMLImageElement>
  ) => {
    if (!att) {
      return (
        <div className="flex items-center justify-center h-full text-stone-400">
          <div className="text-center">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无图片</p>
          </div>
        </div>
      );
    }

    const markers = att.markers || [];
    const isDrawingThisSide = isDrawing && drawingSideRef.current === side;
    const isLinkingThisSide = linkingSide && linkingSide !== side;

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden bg-stone-900 flex items-center justify-center ${
          isAddingAnnotation ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onWheel={(e) => handleWheel(e, side)}
        onMouseDown={(e) => handleMouseDown(e, side)}
        onMouseMove={(e) => handleMouseMove(e, side)}
        onMouseUp={(e) => handleMouseUp(e, side)}
        onMouseLeave={() => handleMouseLeave(side)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          ref={imgRef}
          src={att.url}
          alt={att.title}
          draggable={false}
          className="select-none max-w-none"
          style={{
            transform: `translate(${view.translateX}px, ${view.translateY}px) scale(${view.scale})`,
            transformOrigin: 'center center'
          }}
        />

        {showAnnotations && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${view.translateX}px, ${view.translateY}px) scale(${view.scale})`,
              transformOrigin: 'center center'
            }}
          >
            {markers.map((marker) => {
              const isHighlighted =
                highlightedMarkerId === marker.id ||
                (linkingMarkerId && marker.linkedMarkerId === linkingMarkerId);
              const isEditing = editingMarkerId === marker.id && editingSide === side;
              const isLinkSource = linkingMarkerId === marker.id;
              const canLinkTarget = isLinkingThisSide;

              return (
                <div
                  key={marker.id}
                  className={`absolute border-2 pointer-events-auto transition-all ${
                    isHighlighted || isLinkSource
                      ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse'
                      : ''
                  } ${canLinkTarget ? 'cursor-pointer hover:ring-4 hover:ring-blue-400' : ''}`}
                  style={{
                    left: `calc(50% + ${marker.x}px)`,
                    top: `calc(50% + ${marker.y}px)`,
                    width: marker.width,
                    height: marker.height,
                    borderColor: marker.color,
                    backgroundColor: `${marker.color}20`
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canLinkTarget && linkingMarkerId) {
                      handleCompleteLink(marker.id, side);
                    } else if (!isAddingAnnotation) {
                      handleStartEdit(marker, side);
                    }
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-medium text-white rounded whitespace-nowrap"
                    style={{ backgroundColor: marker.color }}
                  >
                    {marker.label}
                    {marker.linkedMarkerId && (
                      <Link2 className="w-2.5 h-2.5 inline-block ml-1" />
                    )}
                  </span>
                </div>
              );
            })}

            {isDrawingThisSide && drawRect && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                  left: `calc(50% + ${drawRect.x}px)`,
                  top: `calc(50% + ${drawRect.y}px)`,
                  width: drawRect.w,
                  height: drawRect.h
                }}
              />
            )}
          </div>
        )}

        {magnifier.visible && !isDragging && !isDrawing && (
          <Magnifier
            x={magnifier.x}
            y={magnifier.y}
            imageUrl={att.url}
            containerRef={containerRef}
            view={view}
            imgRef={imgRef}
          />
        )}

        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
          {Math.round(view.scale * 100)}%
        </div>
      </div>
    );
  };

  const getSideTitle = (side: 'left' | 'right') => {
    const att = side === 'left' ? leftAttachment : rightAttachment;
    return att ? att.title : side === 'left' ? '左图' : '右图';
  };

  const dialogTitle = isCompareMode
    ? `图片对照: ${getSideTitle('left')} ↔ ${getSideTitle('right')}`
    : attachment?.title || '图片查看';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      size="xl"
    >
      <div className="flex flex-col h-[75vh] -mx-6 -mb-6">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 bg-stone-50">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-16 text-center text-xs text-stone-600 font-mono">
            {Math.round(leftView.scale * 100)}%
          </div>
          <div className="w-px h-5 bg-stone-300 mx-1" />
          <button
            onClick={handleReset}
            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded transition-colors"
            title="重置视图"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-stone-300 mx-1" />
          <button
            onClick={() => setShowAnnotations((v) => !v)}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              showAnnotations ? 'bg-amber-100 text-amber-700' : 'text-stone-600 hover:bg-stone-200'
            }`}
            title={showAnnotations ? '隐藏标注' : '显示标注'}
          >
            {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-xs">标注</span>
          </button>
          <button
            onClick={() => {
              setIsAddingAnnotation((v) => !v);
              setEditingMarkerId(null);
            }}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              isAddingAnnotation
                ? 'bg-blue-100 text-blue-700'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
            title={isAddingAnnotation ? '取消添加' : '添加标注'}
          >
            <Square className="w-4 h-4" />
            <span className="text-xs">
              {isAddingAnnotation ? '绘制中...' : '添加'}
            </span>
          </button>
          <div className="w-px h-5 bg-stone-300 mx-1" />
          {isCompareMode && (
            <>
              <button
                onClick={() => setSyncZoom((v) => !v)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                  syncZoom ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-200'
                }`}
                title="同步缩放"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="text-xs">同步缩放</span>
              </button>
              <button
                onClick={() => setSyncPan((v) => !v)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                  syncPan ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-200'
                }`}
                title="同步平移"
              >
                <Move className="w-4 h-4" />
                <span className="text-xs">同步平移</span>
              </button>
              <div className="w-px h-5 bg-stone-300 mx-1" />
            </>
          )}
          <button
            onClick={() => {
              setLinkingMarkerId(null);
              setLinkingSide(null);
            }}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              linkingMarkerId ? 'bg-purple-100 text-purple-700' : 'text-stone-600 hover:bg-stone-200'
            }`}
            title="关联标注"
          >
            <Link2 className="w-4 h-4" />
            <span className="text-xs">
              {linkingMarkerId ? '点击对侧标注建立关联...' : '关联'}
            </span>
            {linkingMarkerId && (
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelLink();
                }}
              />
            )}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-stone-200">
            {isCompareMode && (
              <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 text-xs font-medium text-stone-600 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Columns className="w-3 h-3" />
                  {getSideTitle('left')}
                </span>
                {leftAttachment && (
                  <span className="text-stone-400">
                    {leftAttachment.markers?.length || 0} 个标注
                  </span>
                )}
              </div>
            )}
            <div className="flex-1">
              {renderImageCanvas(
                leftAttachment,
                leftView,
                leftMagnifier,
                'left',
                leftContainerRef,
                leftImageRef
              )}
            </div>
          </div>

          {isCompareMode && (
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 text-xs font-medium text-stone-600 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Columns className="w-3 h-3" />
                  {getSideTitle('right')}
                </span>
                {rightAttachment && (
                  <span className="text-stone-400">
                    {rightAttachment.markers?.length || 0} 个标注
                  </span>
                )}
              </div>
              <div className="flex-1">
                {renderImageCanvas(
                  rightAttachment,
                  rightView,
                  rightMagnifier,
                  'right',
                  rightContainerRef,
                  rightImageRef
                )}
              </div>
            </div>
          )}

          <div className="w-64 flex flex-col border-l border-stone-200 bg-white">
            <div className="px-3 py-2 border-b border-stone-200 bg-stone-50">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Square className="w-4 h-4" />
                标注列表
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {!isCompareMode && (
                <MarkerList
                  markers={leftAttachment?.markers || []}
                  side="left"
                  onEdit={handleStartEdit}
                  onLocate={handleLocateMarker}
                  onLink={handleStartLink}
                  editingMarkerId={editingMarkerId}
                  editingSide={editingSide}
                  linkingMarkerId={linkingMarkerId}
                  linkingSide={linkingSide}
                  highlightedMarkerId={highlightedMarkerId}
                />
              )}
              {isCompareMode && (
                <>
                  <div className="text-xs font-medium text-stone-500 px-1 mb-1 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    左图标注 ({leftAttachment?.markers?.length || 0})
                  </div>
                  <MarkerList
                    markers={leftAttachment?.markers || []}
                    side="left"
                    onEdit={handleStartEdit}
                    onLocate={handleLocateMarker}
                    onLink={handleStartLink}
                    editingMarkerId={editingMarkerId}
                    editingSide={editingSide}
                    linkingMarkerId={linkingMarkerId}
                    linkingSide={linkingSide}
                    highlightedMarkerId={highlightedMarkerId}
                  />
                  <div className="text-xs font-medium text-stone-500 px-1 mt-3 mb-1 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    右图标注 ({rightAttachment?.markers?.length || 0})
                  </div>
                  <MarkerList
                    markers={rightAttachment?.markers || []}
                    side="right"
                    onEdit={handleStartEdit}
                    onLocate={handleLocateMarker}
                    onLink={handleStartLink}
                    editingMarkerId={editingMarkerId}
                    editingSide={editingSide}
                    linkingMarkerId={linkingMarkerId}
                    linkingSide={linkingSide}
                    highlightedMarkerId={highlightedMarkerId}
                  />
                  {markersWithLinks.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-purple-600 px-1 mt-3 mb-1 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        关联标注对 ({markersWithLinks.length})
                      </div>
                      {markersWithLinks.map((pair, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-purple-50 border border-purple-200 rounded text-xs"
                        >
                          <div className="flex items-center gap-1 text-purple-700 mb-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pair.left.color }}
                            />
                            {pair.left.label}
                            <Link2 className="w-3 h-3" />
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pair.right.color }}
                            />
                            {pair.right.label}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-4">
            {!isCompareMode && attachment && (
              <>
                <span>
                  <strong className="text-stone-700">标题:</strong> {attachment.title}
                </span>
                <span>
                  <strong className="text-stone-700">上传者:</strong> {attachment.uploadedBy}
                </span>
                <span>
                  <strong className="text-stone-700">时间:</strong>{' '}
                  {new Date(attachment.createdAt).toLocaleString('zh-CN')}
                </span>
              </>
            )}
            {isCompareMode && (
              <span>
                对照模式 | 同步缩放: {syncZoom ? '开' : '关'} | 同步平移: {syncPan ? '开' : '关'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-stone-400">
            <Move className="w-3 h-3" />
            <span>拖拽平移</span>
            <span className="mx-1">·</span>
            <Search className="w-3 h-3" />
            <span>滚轮缩放</span>
          </div>
        </div>
      </div>

      {editingMarkerId && editingSide && (
        <EditMarkerPanel
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSaveEdit}
          onCancel={() => {
            setEditingMarkerId(null);
            setEditingSide(null);
          }}
          onDelete={() => handleDeleteMarker(editingMarkerId, editingSide)}
        />
      )}
    </Dialog>
  );
}

interface MarkerListProps {
  markers: AnnotationMarker[];
  side: 'left' | 'right';
  onEdit: (marker: AnnotationMarker, side: 'left' | 'right') => void;
  onLocate: (marker: AnnotationMarker, side: 'left' | 'right') => void;
  onLink: (markerId: string, side: 'left' | 'right') => void;
  editingMarkerId: string | null;
  editingSide: 'left' | 'right' | null;
  linkingMarkerId: string | null;
  linkingSide: 'left' | 'right' | null;
  highlightedMarkerId: string | null;
}

function MarkerList({
  markers,
  side,
  onEdit,
  onLocate,
  onLink,
  editingMarkerId,
  editingSide,
  linkingMarkerId,
  linkingSide,
  highlightedMarkerId
}: MarkerListProps) {
  if (markers.length === 0) {
    return (
      <div className="text-xs text-stone-400 text-center py-4">
        暂无标注
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {markers.map((marker) => {
        const isEditing = editingMarkerId === marker.id && editingSide === side;
        const isLinkSource = linkingMarkerId === marker.id && linkingSide === side;
        const isLinkTarget = linkingMarkerId && linkingSide !== side;
        const isHighlighted = highlightedMarkerId === marker.id;

        return (
          <div
            key={marker.id}
            className={`p-2 rounded border text-xs cursor-pointer transition-all ${
              isEditing
                ? 'bg-blue-50 border-blue-300'
                : isHighlighted
                ? 'bg-yellow-50 border-yellow-300 animate-pulse'
                : isLinkSource
                ? 'bg-purple-50 border-purple-300'
                : isLinkTarget
                ? 'bg-blue-50 border-blue-200 hover:border-blue-400'
                : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
            onClick={() => {
              if (isLinkTarget && linkingMarkerId) {
                return;
              }
              onLocate(marker, side);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: marker.color }}
                />
                <span className="font-medium text-stone-700 truncate">{marker.label}</span>
                {marker.linkedMarkerId && (
                  <Link2 className="w-3 h-3 text-purple-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  className="p-1 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="编辑"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(marker, side);
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  className={`p-1 rounded transition-colors ${
                    isLinkSource
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-stone-400 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title={isLinkSource ? '取消关联' : '建立关联'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLink(marker.id, side);
                  }}
                >
                  <Link2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {marker.description && (
              <div className="text-stone-500 text-[10px] truncate pl-4">
                {marker.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface EditMarkerPanelProps {
  editForm: { label: string; color: string; description: string };
  setEditForm: (form: { label: string; color: string; description: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function EditMarkerPanel({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  onDelete
}: EditMarkerPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-96 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <Edit3 className="w-4 h-4" />
            编辑标注
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              标签名称
            </label>
            <input
              type="text"
              value={editForm.label}
              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="输入标签名称"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" />
              颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditForm({ ...editForm, color })}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${
                    editForm.color === color
                      ? 'border-stone-800 scale-110'
                      : 'border-transparent hover:border-stone-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              描述
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="标注描述（可选）"
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 rounded-b-xl flex items-center justify-between">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除标注
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">确认删除?</span>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded transition-colors"
              >
                取消
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1.5 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MagnifierProps {
  x: number;
  y: number;
  imageUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
  view: ViewState;
  imgRef: React.RefObject<HTMLImageElement>;
}

function Magnifier({ x, y, imageUrl, containerRef, view, imgRef }: MagnifierProps) {
  const magnifierSize = 150;
  const zoomFactor = 2.5;

  const containerRect = containerRef.current?.getBoundingClientRect();
  const imgNaturalWidth = imgRef.current?.naturalWidth || 1;
  const imgNaturalHeight = imgRef.current?.naturalHeight || 1;

  if (!containerRect) return null;

  const displayWidth = containerRect.width;
  const displayHeight = containerRect.height;
  const scaleFit = Math.min(displayWidth / imgNaturalWidth, displayHeight / imgNaturalHeight);
  const imgDisplayW = imgNaturalWidth * scaleFit * view.scale;
  const imgDisplayH = imgNaturalHeight * scaleFit * view.scale;
  const offsetX = (displayWidth - imgDisplayW) / 2 + view.translateX;
  const offsetY = (displayHeight - imgDisplayH) / 2 + view.translateY;

  const isInsideImage =
    x >= offsetX && x <= offsetX + imgDisplayW && y >= offsetY && y <= offsetY + imgDisplayH;

  if (!isInsideImage) return null;

  const relX = (x - offsetX) / imgDisplayW;
  const relY = (y - offsetY) / imgDisplayH;

  const bgSize = `${imgDisplayW * zoomFactor}px ${imgDisplayH * zoomFactor}px`;
  const bgPosX = -(relX * imgDisplayW * zoomFactor - magnifierSize / 2);
  const bgPosY = -(relY * imgDisplayH * zoomFactor - magnifierSize / 2);

  return (
    <div
      className="absolute pointer-events-none border-2 border-white rounded-full shadow-2xl overflow-hidden z-10"
      style={{
        width: magnifierSize,
        height: magnifierSize,
        left: x + 20,
        top: y + 20,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: bgSize,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 border border-white/30 rounded-full" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
    </div>
  );
}
