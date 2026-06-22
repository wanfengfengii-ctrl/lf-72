import { useState, useMemo } from 'react';
import {
  Scale,
  CheckCircle,
  XCircle,
  Edit3,
  Search,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Check,
  X,
  User,
  Clock,
  FileText
} from 'lucide-react';
import Dialog from '@/components/common/Dialog';
import { useStore } from '@/store/useStore';
import {
  ArbitrationOutcome,
  ArbitrationOutcomeLabels,
  ReviewVerdict,
  ReviewVerdictLabels,
  ReviewVerdictColors,
  ReviewEvidenceTypeLabels
} from '@/types';

interface ArbitrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  arbitrationId: string;
}

export default function ArbitrationDialog({
  isOpen,
  onClose,
  arbitrationId
}: ArbitrationDialogProps) {
  const {
    arbitrations,
    fragments,
    relations,
    researchers,
    currentResearcherId,
    resolveArbitration,
    dismissArbitration
  } = useStore();

  const [outcome, setOutcome] = useState<ArbitrationOutcome>(ArbitrationOutcome.ACCEPT_RELATION);
  const [finalConfidence, setFinalConfidence] = useState(75);
  const [arbitrationNotes, setArbitrationNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const arbitration = useMemo(() =>
    arbitrations.find((a) => a.id === arbitrationId),
    [arbitrations, arbitrationId]
  );

  const relation = useMemo(() =>
    arbitration ? relations.find((r) => r.id === arbitration.relationId) : null,
    [relations, arbitration]
  );

  const sourceFragment = useMemo(() =>
    fragments.find((f) => f.id === arbitration?.fragmentPair[0]),
    [fragments, arbitration]
  );

  const targetFragment = useMemo(() =>
    fragments.find((f) => f.id === arbitration?.fragmentPair[1]),
    [fragments, arbitration]
  );

  const currentResearcher = useMemo(() =>
    researchers.find((r) => r.id === currentResearcherId),
    [researchers, currentResearcherId]
  );

  const outcomeOptions = [
    { value: ArbitrationOutcome.ACCEPT_RELATION, label: ArbitrationOutcomeLabels[ArbitrationOutcome.ACCEPT_RELATION], icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-400', needsConfidence: true },
    { value: ArbitrationOutcome.REJECT_RELATION, label: ArbitrationOutcomeLabels[ArbitrationOutcome.REJECT_RELATION], icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', activeBg: 'bg-red-100', activeBorder: 'border-red-400', needsConfidence: false },
    { value: ArbitrationOutcome.REVISE_RELATION, label: ArbitrationOutcomeLabels[ArbitrationOutcome.REVISE_RELATION], icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-100', activeBorder: 'border-blue-400', needsConfidence: true },
    { value: ArbitrationOutcome.FURTHER_RESEARCH, label: ArbitrationOutcomeLabels[ArbitrationOutcome.FURTHER_RESEARCH], icon: Search, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-100', activeBorder: 'border-amber-400', needsConfidence: true }
  ];

  const selectedOutcome = outcomeOptions.find((o) => o.value === outcome);
  const needsConfidence = selectedOutcome?.needsConfidence ?? false;

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN');
  };

  const handleResolve = () => {
    setError('');
    setSuccess('');

    if (!arbitrationNotes.trim()) {
      setError('请填写仲裁裁决说明');
      return;
    }
    if (needsConfidence && (finalConfidence < 0 || finalConfidence > 100)) {
      setError('请输入有效的可信度（0-100）');
      return;
    }

    const result = resolveArbitration(
      arbitrationId,
      outcome,
      arbitrationNotes.trim(),
      needsConfidence ? finalConfidence : undefined
    );

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleDismiss = () => {
    setError('');
    setSuccess('');

    if (!arbitrationNotes.trim()) {
      setError('请填写驳回说明');
      return;
    }

    const result = dismissArbitration(arbitrationId, arbitrationNotes.trim());

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const getVerdictIcon = (verdict: ReviewVerdict) => {
    switch (verdict) {
      case ReviewVerdict.SUPPORT: return ThumbsUp;
      case ReviewVerdict.OPPOSE: return ThumbsDown;
      case ReviewVerdict.ABSTAIN: return MinusCircle;
      default: return MinusCircle;
    }
  };

  if (!arbitration) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="仲裁处理"
      size="xl"
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-stone-500 flex items-center gap-1">
            <User className="w-3 h-3" />
            仲裁员：{currentResearcher?.name || currentResearcherId}
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
              onClick={handleDismiss}
              className="px-4 py-2 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              驳回仲裁
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              确认裁决
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">仲裁事项</span>
            <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              共识度：{Math.round(arbitration.consensusScore * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-sm font-semibold text-purple-800">{sourceFragment?.code}</div>
              <div className="text-xs text-purple-600">{sourceFragment?.name}</div>
            </div>
            <div className="text-purple-400 text-xl">↔</div>
            <div className="flex-1 bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-sm font-semibold text-purple-800">{targetFragment?.code}</div>
              <div className="text-xs text-purple-600">{targetFragment?.name}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">支持：{arbitration.supportCount}人</span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">反对：{arbitration.opposeCount}人</span>
            <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded">弃权/建议：{arbitration.abstainCount}人</span>
            {relation && (
              <span className="ml-auto bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                当前可信度：{relation.confidence}%
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-emerald-700">{success}</span>
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            各方评议意见
          </h4>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {arbitration.reviews.map((review) => {
              const reviewer = researchers.find((r) => r.id === review.reviewerId);
              const VerdictIcon = getVerdictIcon(review.verdict);
              return (
                <div
                  key={review.id}
                  className="bg-white rounded-lg p-3 border border-stone-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-400 flex items-center justify-center text-xs font-bold text-white">
                        {reviewer?.avatar || reviewer?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-stone-700">
                          {reviewer?.name || review.reviewerId}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-2">
                          {reviewer?.title} · {reviewer?.institution}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: `${ReviewVerdictColors[review.verdict]}15`,
                        color: ReviewVerdictColors[review.verdict]
                      }}
                    >
                      <VerdictIcon className="w-3 h-3" />
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

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-3">
            <Scale className="w-4 h-4 inline mr-1.5" />
            仲裁裁决
          </label>
          <div className="grid grid-cols-2 gap-2">
            {outcomeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = outcome === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setOutcome(option.value)}
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

        {needsConfidence && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              最终可信度：<span className="text-indigo-600 font-bold">{finalConfidence}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={finalConfidence}
              onChange={(e) => setFinalConfidence(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            裁决说明
          </label>
          <textarea
            value={arbitrationNotes}
            onChange={(e) => setArbitrationNotes(e.target.value)}
            placeholder="请详细说明仲裁裁决的理由和依据，综合考虑各方意见和证据..."
            rows={4}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
          />
          <div className="text-xs text-stone-400 mt-1 text-right">
            {arbitrationNotes.length} 字
          </div>
        </div>
      </div>
    </Dialog>
  );
}
