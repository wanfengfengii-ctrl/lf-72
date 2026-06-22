import { useMemo, useState } from 'react';
import {
  Users,
  MessageSquare,
  Scale,
  CheckCircle,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Eye,
  History,
  User,
  Search,
  X
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  ReviewVerdict,
  ReviewVerdictLabels,
  ReviewVerdictColors,
  ArbitrationStatus,
  ArbitrationStatusLabels,
  ArbitrationStatusColors,
  ArbitrationOutcomeLabels,
  ReviewEvidenceTypeLabels
} from '@/types';
import ReviewTimeline from './ReviewTimeline';

interface CollaborationPanelProps {
  onOpenReviewDialog: (relationId: string, editReviewId?: string | null) => void;
  onOpenArbitrationDialog: (arbitrationId: string) => void;
}

type TabType = 'summaries' | 'pending' | 'resolved' | 'timeline';

export default function CollaborationPanel({
  onOpenReviewDialog,
  onOpenArbitrationDialog
}: CollaborationPanelProps) {
  const {
    fragments,
    relations,
    researchers,
    currentResearcherId,
    setCurrentResearcher,
    reviews,
    getAllReviewSummaries,
    getPendingArbitrations,
    getResolvedArbitrations,
    getReviewsForRelation,
    createArbitration,
    deleteReview
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('summaries');
  const [expandedRelationId, setExpandedRelationId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showResearcherSelect, setShowResearcherSelect] = useState(false);

  const allSummaries = useMemo(() => getAllReviewSummaries(), [getAllReviewSummaries]);
  const pendingArbitrations = useMemo(() => getPendingArbitrations(), [getPendingArbitrations]);
  const resolvedArbitrations = useMemo(() => getResolvedArbitrations(), [getResolvedArbitrations]);
  const currentResearcher = useMemo(() => researchers.find((r) => r.id === currentResearcherId), [researchers, currentResearcherId]);

  const filteredSummaries = useMemo(() => {
    if (!searchText.trim()) return allSummaries;
    const s = searchText.trim().toLowerCase();
    return allSummaries.filter((summary) => {
      const sourceFrag = fragments.find((f) => f.id === summary.fragmentPair[0]);
      const targetFrag = fragments.find((f) => f.id === summary.fragmentPair[1]);
      return (
        sourceFrag?.code.toLowerCase().includes(s) ||
        sourceFrag?.name.toLowerCase().includes(s) ||
        targetFrag?.code.toLowerCase().includes(s) ||
        targetFrag?.name.toLowerCase().includes(s)
      );
    });
  }, [allSummaries, searchText, fragments]);

  const stats = useMemo(() => ({
    totalReviews: reviews.length,
    totalRelationsWithReviews: allSummaries.length,
    pendingArbitrations: pendingArbitrations.length,
    resolvedArbitrations: resolvedArbitrations.length,
    consensusCount: allSummaries.filter((s) => s.hasConsensus).length,
    needsArbitrationCount: allSummaries.filter((s) => s.needsArbitration).length
  }), [reviews, allSummaries, pendingArbitrations, resolvedArbitrations]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateArbitration = (relationId: string) => {
    const result = createArbitration(relationId);
    if (result.success && result.arbitrationId) {
      onOpenArbitrationDialog(result.arbitrationId);
    } else {
      alert(result.message);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('确定要删除此评议吗？')) {
      deleteReview(reviewId);
    }
  };

  const getVerdictIcon = (verdict: ReviewVerdict) => {
    switch (verdict) {
      case ReviewVerdict.SUPPORT: return ThumbsUp;
      case ReviewVerdict.OPPOSE: return ThumbsDown;
      case ReviewVerdict.ABSTAIN: return MinusCircle;
      case ReviewVerdict.SUGGEST_REVIEW: return Eye;
      default: return MinusCircle;
    }
  };

  const tabs = [
    { id: 'summaries' as TabType, label: '观点汇总', icon: MessageSquare, count: allSummaries.length },
    { id: 'pending' as TabType, label: '待仲裁', icon: Clock, count: pendingArbitrations.length },
    { id: 'resolved' as TabType, label: '已裁决', icon: CheckCircle, count: resolvedArbitrations.length },
    { id: 'timeline' as TabType, label: '时间轴', icon: History }
  ];

  return (
    <div className="flex flex-col h-full bg-stone-50 border-l border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            协同评议
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowResearcherSelect(!showResearcherSelect)}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold text-white">
                {currentResearcher?.avatar || currentResearcher?.name?.charAt(0) || '?'}
              </div>
              <span className="text-xs font-medium text-stone-700">{currentResearcher?.name || '选择身份'}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>
            {showResearcherSelect && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                {researchers.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setCurrentResearcher(r.id);
                      setShowResearcherSelect(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-stone-50 transition-colors ${
                      r.id === currentResearcherId ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold text-white">
                      {r.avatar || r.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-700 truncate">{r.name}</div>
                      <div className="text-[10px] text-stone-400 truncate">{r.title} · {r.institution}</div>
                    </div>
                    {r.id === currentResearcherId && (
                      <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-teal-50 rounded-md p-2 border border-teal-100">
            <div className="text-[10px] text-teal-600 mb-0.5">总评议数</div>
            <div className="text-sm font-bold text-teal-700">{stats.totalReviews}</div>
          </div>
          <div className="bg-amber-50 rounded-md p-2 border border-amber-100">
            <div className="text-[10px] text-amber-600 mb-0.5">待仲裁</div>
            <div className="text-sm font-bold text-amber-700">{stats.pendingArbitrations}</div>
          </div>
          <div className="bg-emerald-50 rounded-md p-2 border border-emerald-100">
            <div className="text-[10px] text-emerald-600 mb-0.5">已裁决</div>
            <div className="text-sm font-bold text-emerald-700">{stats.resolvedArbitrations}</div>
          </div>
        </div>

        {activeTab === 'summaries' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索残片编号或名称..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
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
        )}

        <div className="flex bg-stone-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all
                  ${isActive
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                    isActive ? 'bg-teal-100 text-teal-700' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'summaries' && (
          <div className="p-4 space-y-3">
            {filteredSummaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-stone-300 mb-3" />
                <p className="text-sm text-stone-500 mb-1">暂无评议数据</p>
                <p className="text-xs text-stone-400">选择缀合关系后可提交评议</p>
              </div>
            ) : (
              filteredSummaries.map((summary) => {
                const sourceFrag = fragments.find((f) => f.id === summary.fragmentPair[0]);
                const targetFrag = fragments.find((f) => f.id === summary.fragmentPair[1]);
                const relationReviews = getReviewsForRelation(summary.relationId);
                const myReview = relationReviews.find((r) => r.reviewerId === currentResearcherId);
                const isExpanded = expandedRelationId === summary.relationId;

                return (
                  <div
                    key={summary.relationId}
                    className={`bg-white rounded-lg border overflow-hidden transition-all ${
                      summary.needsArbitration
                        ? 'border-amber-300'
                        : summary.hasConsensus
                          ? 'border-emerald-200'
                          : 'border-stone-200'
                    }`}
                  >
                    <div
                      className="p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                      onClick={() => setExpandedRelationId(isExpanded ? null : summary.relationId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-stone-800">
                            {sourceFrag?.code} ↔ {targetFrag?.code}
                          </span>
                          {summary.hasConsensus && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded font-medium flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" />
                              已共识
                            </span>
                          )}
                          {summary.needsArbitration && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              需仲裁
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${summary.supportCount / summary.totalReviews * 100}%` }}
                          />
                          <div
                            className="bg-red-500 h-full transition-all"
                            style={{ width: `${summary.opposeCount / summary.totalReviews * 100}%` }}
                          />
                          <div
                            className="bg-stone-400 h-full transition-all"
                            style={{ width: `${summary.abstainCount / summary.totalReviews * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-stone-600 flex-shrink-0">
                          {summary.totalReviews}人
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">支持 {summary.supportCount}</span>
                          <span className="text-red-600 font-medium">反对 {summary.opposeCount}</span>
                          <span className="text-stone-500">弃权 {summary.abstainCount}</span>
                        </div>
                        <div className="flex items-center gap-1 text-stone-400">
                          <span>共识度 {Math.round(summary.consensusScore * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-stone-200 bg-stone-50 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-600">评议详情</span>
                          <div className="flex gap-1">
                            {myReview ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenReviewDialog(summary.relationId, myReview.id);
                                  }}
                                  className="px-2 py-1 text-[11px] bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  编辑我的评议
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReview(myReview.id);
                                  }}
                                  className="px-2 py-1 text-[11px] bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenReviewDialog(summary.relationId);
                                }}
                                className="px-2 py-1 text-[11px] bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition-colors flex items-center gap-1"
                              >
                                <MessageSquarePlus className="w-3 h-3" />
                                提交评议
                              </button>
                            )}
                            {summary.needsArbitration && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateArbitration(summary.relationId);
                                }}
                                className="px-2 py-1 text-[11px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors flex items-center gap-1"
                              >
                                <Scale className="w-3 h-3" />
                                申请仲裁
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {relationReviews.map((review) => {
                            const reviewer = researchers.find((r) => r.id === review.reviewerId);
                            const VerdictIcon = getVerdictIcon(review.verdict);
                            const isMe = review.reviewerId === currentResearcherId;
                            return (
                              <div
                                key={review.id}
                                className={`p-2.5 rounded-lg border text-xs ${
                                  isMe ? 'bg-teal-50 border-teal-200' : 'bg-white border-stone-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                      isMe ? 'bg-teal-500' : 'bg-stone-400'
                                    }`}>
                                      {reviewer?.avatar || reviewer?.name?.charAt(0) || '?'}
                                    </div>
                                    <span className="font-medium text-stone-700">
                                      {reviewer?.name || review.reviewerId}
                                      {isMe && <span className="text-teal-600 ml-1">（我）</span>}
                                    </span>
                                  </div>
                                  <span
                                    className="px-1.5 py-0.5 text-[10px] rounded font-medium flex items-center gap-0.5"
                                    style={{
                                      backgroundColor: `${ReviewVerdictColors[review.verdict]}15`,
                                      color: ReviewVerdictColors[review.verdict]
                                    }}
                                  >
                                    <VerdictIcon className="w-2.5 h-2.5" />
                                    {ReviewVerdictLabels[review.verdict]} · {review.confidence}%
                                  </span>
                                </div>
                                <p className="text-stone-600 leading-relaxed mb-1.5">
                                  {review.justification}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {review.evidenceTypes.map((et) => (
                                    <span key={et} className="text-[9px] bg-stone-100 text-stone-500 px-1 py-0.5 rounded">
                                      {ReviewEvidenceTypeLabels[et]}
                                    </span>
                                  ))}
                                  <span className="text-[9px] text-stone-400 ml-auto">
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
                );
              })
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="p-4 space-y-3">
            {pendingArbitrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-stone-300 mb-3" />
                <p className="text-sm text-stone-500 mb-1">暂无待仲裁事项</p>
                <p className="text-xs text-stone-400">存在分歧的评议将在此显示</p>
              </div>
            ) : (
              pendingArbitrations.map((arbitration) => {
                const sourceFrag = fragments.find((f) => f.id === arbitration.fragmentPair[0]);
                const targetFrag = fragments.find((f) => f.id === arbitration.fragmentPair[1]);

                return (
                  <div
                    key={arbitration.id}
                    className="bg-white rounded-lg border border-amber-300 overflow-hidden"
                  >
                    <div className="p-3 bg-amber-50 border-b border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">
                            {sourceFrag?.code} ↔ {targetFrag?.code}
                          </span>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${ArbitrationStatusColors[arbitration.status]}15`,
                            color: ArbitrationStatusColors[arbitration.status]
                          }}
                        >
                          {ArbitrationStatusLabels[arbitration.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">支持 {arbitration.supportCount}</span>
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">反对 {arbitration.opposeCount}</span>
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded">弃权 {arbitration.abstainCount}</span>
                        <span className="ml-auto text-amber-600 font-medium">
                          共识度 {Math.round(arbitration.consensusScore * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">
                          申请时间：{formatDateTime(arbitration.createdAt)}
                        </span>
                        <button
                          onClick={() => onOpenArbitrationDialog(arbitration.id)}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors flex items-center gap-1"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          处理仲裁
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'resolved' && (
          <div className="p-4 space-y-3">
            {resolvedArbitrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-stone-300 mb-3" />
                <p className="text-sm text-stone-500 mb-1">暂无已裁决事项</p>
                <p className="text-xs text-stone-400">处理完成的仲裁将在此显示</p>
              </div>
            ) : (
              resolvedArbitrations.map((arbitration) => {
                const sourceFrag = fragments.find((f) => f.id === arbitration.fragmentPair[0]);
                const targetFrag = fragments.find((f) => f.id === arbitration.fragmentPair[1]);
                const arbitrator = arbitration.arbitratorId ? researchers.find((r) => r.id === arbitration.arbitratorId) : null;

                return (
                  <div
                    key={arbitration.id}
                    className={`bg-white rounded-lg border overflow-hidden ${
                      arbitration.status === ArbitrationStatus.RESOLVED ? 'border-emerald-300' : 'border-stone-200'
                    }`}
                  >
                    <div className={`p-3 border-b ${
                      arbitration.status === ArbitrationStatus.RESOLVED ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Scale className={`w-4 h-4 ${
                            arbitration.status === ArbitrationStatus.RESOLVED ? 'text-emerald-600' : 'text-stone-500'
                          }`} />
                          <span className="text-sm font-semibold text-stone-800">
                            {sourceFrag?.code} ↔ {targetFrag?.code}
                          </span>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${ArbitrationStatusColors[arbitration.status]}15`,
                            color: ArbitrationStatusColors[arbitration.status]
                          }}
                        >
                          {ArbitrationStatusLabels[arbitration.status]}
                        </span>
                      </div>
                      {arbitration.outcome && (
                        <div className="text-xs text-stone-600 mb-1">
                          裁决结果：<span className="font-semibold text-emerald-700">
                            {ArbitrationOutcomeLabels[arbitration.outcome]}
                          </span>
                          {arbitration.finalConfidence !== undefined && (
                            <span className="ml-2">（最终可信度：{arbitration.finalConfidence}%）</span>
                          )}
                        </div>
                      )}
                      {arbitrator && (
                        <div className="text-xs text-stone-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          仲裁员：{arbitrator.name}
                        </div>
                      )}
                    </div>
                    {arbitration.arbitrationNotes && (
                      <div className="p-3">
                        <div className="text-xs font-semibold text-stone-600 mb-1">裁决说明</div>
                        <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2 rounded border border-stone-100">
                          {arbitration.arbitrationNotes}
                        </p>
                        {arbitration.arbitratedAt && (
                          <div className="text-[10px] text-stone-400 mt-2 text-right">
                            裁决时间：{formatDateTime(arbitration.arbitratedAt)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <ReviewTimeline />
        )}
      </div>
    </div>
  );
}
