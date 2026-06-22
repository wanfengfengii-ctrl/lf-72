import { useMemo } from 'react';
import {
  History,
  MessageSquare,
  Scale,
  Link as LinkIcon,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Eye,
  Clock,
  User
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  ReviewVerdict,
  ReviewVerdictLabels,
  ReviewVerdictColors,
  ArbitrationStatus,
  ArbitrationStatusLabels,
  ArbitrationStatusColors,
  ArbitrationOutcome,
  ArbitrationOutcomeLabels
} from '@/types';

export default function ReviewTimeline() {
  const {
    fragments,
    getReviewTimeline,
    selectFragment,
    selectRelation
  } = useStore();

  const timeline = useMemo(() => getReviewTimeline(), [getReviewTimeline]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return {
      date: date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      }),
      time: date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getEventIcon = (type: string, verdict?: string) => {
    if (type === 'review') {
      switch (verdict) {
        case ReviewVerdict.SUPPORT: return ThumbsUp;
        case ReviewVerdict.OPPOSE: return ThumbsDown;
        case ReviewVerdict.ABSTAIN: return MinusCircle;
        case ReviewVerdict.SUGGEST_REVIEW: return Eye;
        default: return MessageSquare;
      }
    }
    if (type === 'arbitration') return Scale;
    return LinkIcon;
  };

  const getEventColor = (type: string, verdict?: string, status?: string) => {
    if (type === 'review' && verdict) {
      return ReviewVerdictColors[verdict as keyof typeof ReviewVerdictColors] || '#6B7280';
    }
    if (type === 'arbitration' && status) {
      return ArbitrationStatusColors[status as keyof typeof ArbitrationStatusColors] || '#6B7280';
    }
    if (type === 'relation_change') return '#3B82F6';
    return '#6B7280';
  };

  const handleEventClick = (relationId: string, fragmentPair: [string, string]) => {
    selectRelation(relationId);
  };

  const getEventDetails = (event: ReturnType<typeof getReviewTimeline>[0]) => {
    if (event.type === 'review' && event.details) {
      const verdict = event.details.verdict as ReviewVerdict;
      const confidence = event.details.confidence as number;
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded ml-1"
          style={{
            backgroundColor: `${getEventColor(event.type, verdict)}15`,
            color: getEventColor(event.type, verdict)
          }}
        >
          {ReviewVerdictLabels[verdict]} · {confidence}%
        </span>
      );
    }
    if (event.type === 'arbitration' && event.details) {
      const status = event.details.status as ArbitrationStatus;
      const outcome = event.details.outcome as ArbitrationOutcome;
      if (outcome) {
        return (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded ml-1"
            style={{
              backgroundColor: `${getEventColor(event.type, undefined, status)}15`,
              color: getEventColor(event.type, undefined, status)
            }}
          >
            {ArbitrationOutcomeLabels[outcome]}
          </span>
        );
      }
      return (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded ml-1"
          style={{
            backgroundColor: `${getEventColor(event.type, undefined, status)}15`,
            color: getEventColor(event.type, undefined, status)
          }}
        >
          {ArbitrationStatusLabels[status]}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="w-12 h-12 text-stone-300 mb-3" />
          <p className="text-sm text-stone-500 mb-1">暂无时间轴记录</p>
          <p className="text-xs text-stone-400">提交评议或创建仲裁后将在此显示</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-purple-200 to-amber-200" />

            {timeline.map((event, index) => {
              const { date, time } = formatDateTime(event.timestamp);
              const sourceFrag = fragments.find((f) => f.id === event.fragmentPair[0]);
              const targetFrag = fragments.find((f) => f.id === event.fragmentPair[1]);
              const color = getEventColor(event.type, event.details?.verdict as string, event.details?.status as string);
              const Icon = getEventIcon(event.type, event.details?.verdict as string);

              const showDate = index === 0 || formatDateTime(timeline[index - 1].timestamp).date !== date;

              return (
                <div key={event.id} className="relative mb-4 last:mb-0">
                  {showDate && (
                    <div className="absolute -left-6 -top-1 flex items-center justify-center">
                      <div className="bg-stone-100 text-[10px] text-stone-500 px-2 py-0.5 rounded-full font-medium">
                        {date}
                      </div>
                    </div>
                  )}

                  <div className={`relative ${showDate ? 'pt-6' : ''}`}>
                    <div
                      className={`absolute -left-4 top-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                        event.type === 'arbitration' ? 'ring-2 ring-purple-200' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      <Icon className="w-2.5 h-2.5 text-white" />
                    </div>

                    <div
                      className="bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-all cursor-pointer overflow-hidden ml-2"
                      onClick={() => handleEventClick(event.relationId, event.fragmentPair)}
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium text-white flex-shrink-0 ${
                                event.type === 'review'
                                  ? event.details?.verdict === ReviewVerdict.SUPPORT
                                    ? 'bg-emerald-500'
                                    : event.details?.verdict === ReviewVerdict.OPPOSE
                                      ? 'bg-red-500'
                                      : event.details?.verdict === ReviewVerdict.SUGGEST_REVIEW
                                        ? 'bg-amber-500'
                                        : 'bg-stone-500'
                                  : event.type === 'arbitration'
                                    ? event.details?.status === ArbitrationStatus.RESOLVED
                                      ? 'bg-emerald-500'
                                      : event.details?.status === ArbitrationStatus.PENDING
                                        ? 'bg-amber-500'
                                        : 'bg-stone-500'
                                    : 'bg-blue-500'
                              }`}
                            >
                              {event.type === 'review' ? '评议' : event.type === 'arbitration' ? '仲裁' : '关系变更'}
                            </span>
                            <span className="text-[10px] text-stone-500 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {time}
                            </span>
                          </div>
                          {event.researcherName && (
                            <span className="text-[10px] text-stone-500 flex items-center gap-0.5 flex-shrink-0">
                              <User className="w-2.5 h-2.5" />
                              {event.researcherName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-medium text-stone-700">
                            {sourceFrag?.code} ↔ {targetFrag?.code}
                          </span>
                          {getEventDetails(event)}
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed">
                          {event.description}
                        </p>

                        {event.details?.supportCount !== undefined && event.details?.opposeCount !== undefined && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                              支持 {event.details.supportCount}
                            </span>
                            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                              反对 {event.details.opposeCount}
                            </span>
                            {event.details.finalConfidence !== undefined && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded ml-auto">
                                最终可信度 {event.details.finalConfidence}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
