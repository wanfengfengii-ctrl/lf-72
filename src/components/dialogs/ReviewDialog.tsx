import { useState, useEffect, useMemo } from 'react';
import {
  MessageSquarePlus,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  HelpCircle,
  Check,
  X,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import {
  ReviewVerdict,
  ReviewVerdictLabels,
  ReviewVerdictColors,
  ReviewEvidenceType,
  ReviewEvidenceTypeLabels
} from '@/types';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  relationId: string;
  editReviewId?: string | null;
}

export default function ReviewDialog({
  isOpen,
  onClose,
  relationId,
  editReviewId
}: ReviewDialogProps) {
  const {
    relations,
    fragments,
    researchers,
    currentResearcherId,
    reviews,
    addReview,
    updateReview,
    getReviewsForRelation
  } = useStore();

  const [verdict, setVerdict] = useState<ReviewVerdict>(ReviewVerdict.SUPPORT);
  const [confidence, setConfidence] = useState(75);
  const [evidenceTypes, setEvidenceTypes] = useState<ReviewEvidenceType[]>([]);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const relation = useMemo(() => relations.find((r) => r.id === relationId), [relations, relationId]);
  const sourceFragment = useMemo(() => fragments.find((f) => f.id === relation?.sourceId), [fragments, relation]);
  const targetFragment = useMemo(() => fragments.find((f) => f.id === relation?.targetId), [fragments, relation]);
  const currentResearcher = useMemo(() => researchers.find((r) => r.id === currentResearcherId), [researchers, currentResearcherId]);
  const existingReviews = useMemo(() => getReviewsForRelation(relationId), [getReviewsForRelation, relationId]);
  const existingReview = useMemo(() => reviews.find((r) => r.id === editReviewId), [reviews, editReviewId]);

  useEffect(() => {
    if (editReviewId && existingReview) {
      setVerdict(existingReview.verdict);
      setConfidence(existingReview.confidence);
      setEvidenceTypes(existingReview.evidenceTypes);
      setJustification(existingReview.justification);
    } else {
      setVerdict(ReviewVerdict.SUPPORT);
      setConfidence(75);
      setEvidenceTypes([]);
      setJustification('');
    }
    setError('');
    setSuccess('');
  }, [editReviewId, existingReview, isOpen]);

  const handleEvidenceTypeToggle = (type: ReviewEvidenceType) => {
    setEvidenceTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = () => {
    setError('');
    setSuccess('');

    if (evidenceTypes.length === 0) {
      setError('请至少选择一种证据类型');
      return;
    }
    if (!justification.trim()) {
      setError('请填写评议依据说明');
      return;
    }
    if (!relation) {
      setError('关系不存在');
      return;
    }

    const reviewData = {
      relationId,
      fragmentPair: [relation.sourceId, relation.targetId] as [string, string],
      reviewerId: currentResearcherId,
      verdict,
      confidence,
      evidenceTypes,
      justification: justification.trim()
    };

    let result;
    if (editReviewId && existingReview) {
      result = updateReview(editReviewId, reviewData);
    } else {
      result = addReview(reviewData);
    }

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const verdictOptions = [
    { value: ReviewVerdict.SUPPORT, label: ReviewVerdictLabels[ReviewVerdict.SUPPORT], icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-400' },
    { value: ReviewVerdict.OPPOSE, label: ReviewVerdictLabels[ReviewVerdict.OPPOSE], icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', activeBg: 'bg-red-100', activeBorder: 'border-red-400' },
    { value: ReviewVerdict.ABSTAIN, label: ReviewVerdictLabels[ReviewVerdict.ABSTAIN], icon: MinusCircle, color: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200', activeBg: 'bg-stone-100', activeBorder: 'border-stone-400' },
    { value: ReviewVerdict.SUGGEST_REVIEW, label: ReviewVerdictLabels[ReviewVerdict.SUGGEST_REVIEW], icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-100', activeBorder: 'border-amber-400' }
  ];

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editReviewId ? '编辑评议' : '提交评议'}
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
              <Check className="w-4 h-4" />
              {editReviewId ? '更新评议' : '提交评议'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {relation && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs text-amber-600 font-medium mb-2">评议对象</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded-lg p-3 border border-amber-100">
                <div className="text-sm font-semibold text-amber-800">{sourceFragment?.code}</div>
                <div className="text-xs text-amber-600">{sourceFragment?.name}</div>
              </div>
              <div className="text-amber-400 text-xl">↔</div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-amber-100">
                <div className="text-sm font-semibold text-amber-800">{targetFragment?.code}</div>
                <div className="text-xs text-amber-600">{targetFragment?.name}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-700">
              <span className="bg-amber-100 px-2 py-0.5 rounded">当前可信度：{relation.confidence}%</span>
            </div>
          </div>
        )}

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
            <MessageSquarePlus className="w-4 h-4 inline mr-1.5" />
            评议结论
          </label>
          <div className="grid grid-cols-2 gap-2">
            {verdictOptions.map((option) => {
              const Icon = option.icon;
              const isActive = verdict === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setVerdict(option.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-left
                    ${isActive
                      ? `${option.activeBg} ${option.activeBorder}`
                      : `${option.bg} ${option.border} hover:border-stone-300`
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${option.color}`} />
                    <span className={`text-sm font-medium ${option.color}`}>
                      {option.label}
                    </span>
                    {isActive && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            可信度评分：<span className="text-indigo-600 font-bold">{confidence}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            证据类型（可多选）
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ReviewEvidenceType) as Array<keyof typeof ReviewEvidenceType>).map((key) => {
              const type = ReviewEvidenceType[key];
              const isActive = evidenceTypes.includes(type);
              return (
                <button
                  key={key}
                  onClick={() => handleEvidenceTypeToggle(type)}
                  className={`
                    p-2.5 rounded-lg border text-xs text-left transition-all
                    ${isActive
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded border ${isActive ? 'bg-indigo-500 border-indigo-500' : 'border-stone-300'}`}>
                      {isActive && <Check className="w-2.5 h-2.5 text-white m-auto" />}
                    </div>
                    {ReviewEvidenceTypeLabels[type]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            依据说明
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="请详细说明您的判断依据，包括具体的文字比对、边缘形态分析、内容关联证据等..."
            rows={5}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
          />
          <div className="text-xs text-stone-400 mt-1 text-right">
            {justification.length} 字
          </div>
        </div>

        {existingReviews.length > 0 && (
          <div className="border-t border-stone-200 pt-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-3">已有评议（{existingReviews.length}）</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {existingReviews.map((review) => {
                const reviewer = researchers.find((r) => r.id === review.reviewerId);
                const isCurrentUser = review.reviewerId === currentResearcherId;
                return (
                  <div
                    key={review.id}
                    className={`p-3 rounded-lg border ${isCurrentUser ? 'bg-indigo-50 border-indigo-200' : 'bg-stone-50 border-stone-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isCurrentUser ? 'bg-indigo-500' : 'bg-stone-400'
                        }`}>
                          {reviewer?.avatar || reviewer?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium text-stone-700">
                          {reviewer?.name || review.reviewerId}
                          {isCurrentUser && <span className="text-xs text-indigo-600 ml-1">（您）</span>}
                        </span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${ReviewVerdictColors[review.verdict]}15`,
                          color: ReviewVerdictColors[review.verdict]
                        }}
                      >
                        {ReviewVerdictLabels[review.verdict]} · {review.confidence}%
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed mb-2">
                      {review.justification}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {review.evidenceTypes.map((et) => (
                        <span key={et} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                          {ReviewEvidenceTypeLabels[et]}
                        </span>
                      ))}
                      <span className="text-[10px] text-stone-400 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(review.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
