export enum RelationType {
  EDGE_MATCH = 'edge_match',
  TEXT_CONTINUITY = 'text_continuity',
  CONTENT_ASSOCIATION = 'content_association',
  SHAPE_MATCH = 'shape_match',
  OTHER = 'other'
}

export const RelationTypeLabels: Record<RelationType, string> = {
  [RelationType.EDGE_MATCH]: '边缘吻合',
  [RelationType.TEXT_CONTINUITY]: '文字连续',
  [RelationType.CONTENT_ASSOCIATION]: '内容关联',
  [RelationType.SHAPE_MATCH]: '形状匹配',
  [RelationType.OTHER]: '其他'
};

export const RelationTypeColors: Record<RelationType, string> = {
  [RelationType.EDGE_MATCH]: '#C0392B',
  [RelationType.TEXT_CONTINUITY]: '#27AE60',
  [RelationType.CONTENT_ASSOCIATION]: '#2C3E50',
  [RelationType.SHAPE_MATCH]: '#8E44AD',
  [RelationType.OTHER]: '#7F8C8D'
};

export interface Fragment {
  id: string;
  code: string;
  name: string;
  description: string;
  era?: string;
  location?: string;
  notes?: string;
  isGrouped: boolean;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  confidence: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HighConfidenceGroup {
  id: string;
  fragmentIds: string[];
  relations: Relation[];
  avgConfidence: number;
  minConfidence: number;
}

export enum ConflictGroupType {
  MULTI_EVIDENCE = 'multi_evidence',
  TRUE_CONFLICT = 'true_conflict'
}

export const ConflictGroupTypeLabels: Record<ConflictGroupType, string> = {
  [ConflictGroupType.MULTI_EVIDENCE]: '多证据支持',
  [ConflictGroupType.TRUE_CONFLICT]: '真实冲突'
};

export enum MultiEvidenceKind {
  SAME_TYPE = 'same_type',
  CROSS_TYPE = 'cross_type'
}

export const MultiEvidenceKindLabels: Record<MultiEvidenceKind, string> = {
  [MultiEvidenceKind.SAME_TYPE]: '同类型多证据',
  [MultiEvidenceKind.CROSS_TYPE]: '跨依据汇聚'
};

export interface ConflictRelationGroup {
  id: string;
  type: ConflictGroupType;
  fragmentPair: [string, string];
  relations: Relation[];
  avgConfidence: number;
  evidenceKind?: MultiEvidenceKind;
  evidenceTypeCount?: number;
}

export interface GroupingValidationDetail {
  hasRelations: boolean;
  relationCount: number;
  hasConflicts: boolean;
  conflictDetails: string[];
  hasHighConfidenceRelations: boolean;
  highConfidenceCount: number;
  connectedToGrouped: boolean;
  connectedGroupedIds: string[];
  minConfidenceOk: boolean;
  minConfidenceValue: number;
}

export interface GroupingValidationResult extends ValidationResult {
  details?: GroupingValidationDetail;
  warnings?: string[];
}

export interface AnalysisResult {
  totalFragments: number;
  totalRelations: number;
  isolatedFragments: Fragment[];
  conflictingRelationGroups: ConflictRelationGroup[];
  multiEvidenceGroups: ConflictRelationGroup[];
  highConfidenceRelations: Relation[];
  highConfidenceGroups: HighConfidenceGroup[];
  groupedFragments: Fragment[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export type NodePositionsMap = Record<string, NodePosition>;

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export enum OperationType {
  FRAGMENT_ADD = 'fragment_add',
  FRAGMENT_UPDATE = 'fragment_update',
  FRAGMENT_DELETE = 'fragment_delete',
  FRAGMENT_GROUP_TOGGLE = 'fragment_group_toggle',
  RELATION_ADD = 'relation_add',
  RELATION_UPDATE = 'relation_update',
  RELATION_DELETE = 'relation_delete',
  RELATION_CONFIDENCE_CHANGE = 'relation_confidence_change',
  NOTES_UPDATE = 'notes_update',
  BATCH_OPERATION = 'batch_operation',
  VERSION_RESTORE = 'version_restore',
  EVIDENCE_ADD = 'evidence_add',
  EVIDENCE_UPDATE = 'evidence_update',
  EVIDENCE_DELETE = 'evidence_delete',
  EVIDENCE_MARKER_ADD = 'evidence_marker_add',
  EVIDENCE_COMPARE = 'evidence_compare'
}

export const OperationTypeLabels: Record<OperationType, string> = {
  [OperationType.FRAGMENT_ADD]: '新增残片',
  [OperationType.FRAGMENT_UPDATE]: '更新残片',
  [OperationType.FRAGMENT_DELETE]: '删除残片',
  [OperationType.FRAGMENT_GROUP_TOGGLE]: '定组状态变更',
  [OperationType.RELATION_ADD]: '新增缀合关系',
  [OperationType.RELATION_UPDATE]: '更新缀合关系',
  [OperationType.RELATION_DELETE]: '删除缀合关系',
  [OperationType.RELATION_CONFIDENCE_CHANGE]: '可信度调整',
  [OperationType.NOTES_UPDATE]: '备注补充',
  [OperationType.BATCH_OPERATION]: '批量操作',
  [OperationType.VERSION_RESTORE]: '版本恢复',
  [OperationType.EVIDENCE_ADD]: '新增证据附件',
  [OperationType.EVIDENCE_UPDATE]: '更新证据附件',
  [OperationType.EVIDENCE_DELETE]: '删除证据附件',
  [OperationType.EVIDENCE_MARKER_ADD]: '添加比对标注',
  [OperationType.EVIDENCE_COMPARE]: '创建比对会话'
};

export const OperationTypeColors: Record<OperationType, string> = {
  [OperationType.FRAGMENT_ADD]: '#10B981',
  [OperationType.FRAGMENT_UPDATE]: '#3B82F6',
  [OperationType.FRAGMENT_DELETE]: '#EF4444',
  [OperationType.FRAGMENT_GROUP_TOGGLE]: '#8B5CF6',
  [OperationType.RELATION_ADD]: '#10B981',
  [OperationType.RELATION_UPDATE]: '#3B82F6',
  [OperationType.RELATION_DELETE]: '#EF4444',
  [OperationType.RELATION_CONFIDENCE_CHANGE]: '#F59E0B',
  [OperationType.NOTES_UPDATE]: '#6366F1',
  [OperationType.BATCH_OPERATION]: '#EC4899',
  [OperationType.VERSION_RESTORE]: '#14B8A6',
  [OperationType.EVIDENCE_ADD]: '#0EA5E9',
  [OperationType.EVIDENCE_UPDATE]: '#0284C7',
  [OperationType.EVIDENCE_DELETE]: '#DC2626',
  [OperationType.EVIDENCE_MARKER_ADD]: '#059669',
  [OperationType.EVIDENCE_COMPARE]: '#7C3AED'
};

export interface FieldChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  label?: string;
}

export interface OperationTarget {
  type: 'fragment' | 'relation' | 'review' | 'evidence' | 'system';
  id?: string;
  code?: string;
  name?: string;
}

export interface OperationRecord {
  id: string;
  version: number;
  type: OperationType;
  timestamp: string;
  operator: string;
  targets: OperationTarget[];
  changes: FieldChange[];
  description: string;
  note?: string;
  snapshotId: string;
}

export interface VersionSnapshot {
  id: string;
  version: number;
  timestamp: string;
  fragments: Fragment[];
  relations: Relation[];
  nodePositions: NodePositionsMap;
  operationId: string;
  checksum: string;
}

export interface VersionDiff {
  versionA: number;
  versionB: number;
  fragmentsAdded: Fragment[];
  fragmentsRemoved: Fragment[];
  fragmentsModified: Array<{ old: Fragment; new: Fragment; changes: FieldChange[] }>;
  relationsAdded: Relation[];
  relationsRemoved: Relation[];
  relationsModified: Array<{ old: Relation; new: Relation; changes: FieldChange[] }>;
  summary: {
    totalChanges: number;
    fragmentChanges: number;
    relationChanges: number;
  };
}

export interface HistoryFilter {
  operationTypes?: OperationType[];
  targetType?: 'fragment' | 'relation' | 'all';
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  operator?: string;
}

export enum ReviewVerdict {
  SUPPORT = 'support',
  OPPOSE = 'oppose',
  ABSTAIN = 'abstain',
  SUGGEST_REVIEW = 'suggest_review'
}

export const ReviewVerdictLabels: Record<ReviewVerdict, string> = {
  [ReviewVerdict.SUPPORT]: '支持',
  [ReviewVerdict.OPPOSE]: '反对',
  [ReviewVerdict.ABSTAIN]: '弃权',
  [ReviewVerdict.SUGGEST_REVIEW]: '建议复核'
};

export const ReviewVerdictColors: Record<ReviewVerdict, string> = {
  [ReviewVerdict.SUPPORT]: '#10B981',
  [ReviewVerdict.OPPOSE]: '#EF4444',
  [ReviewVerdict.ABSTAIN]: '#6B7280',
  [ReviewVerdict.SUGGEST_REVIEW]: '#F59E0B'
};

export enum ReviewEvidenceType {
  EDGE_MORPHOLOGY = 'edge_morphology',
  TEXT_CONTINUITY = 'text_continuity',
  CONTENT_RELEVANCE = 'content_relevance',
  SHAPE_MATCH = 'shape_match',
  HISTORICAL_CONTEXT = 'historical_context',
  OTHER = 'other'
}

export const ReviewEvidenceTypeLabels: Record<ReviewEvidenceType, string> = {
  [ReviewEvidenceType.EDGE_MORPHOLOGY]: '边缘形态学',
  [ReviewEvidenceType.TEXT_CONTINUITY]: '文字连续性',
  [ReviewEvidenceType.CONTENT_RELEVANCE]: '内容关联性',
  [ReviewEvidenceType.SHAPE_MATCH]: '形状匹配',
  [ReviewEvidenceType.HISTORICAL_CONTEXT]: '历史语境',
  [ReviewEvidenceType.OTHER]: '其他'
};

export interface Researcher {
  id: string;
  name: string;
  title: string;
  institution: string;
  avatar?: string;
  specialties: string[];
}

export interface Review {
  id: string;
  relationId: string;
  fragmentPair: [string, string];
  reviewerId: string;
  verdict: ReviewVerdict;
  confidence: number;
  evidenceTypes: ReviewEvidenceType[];
  justification: string;
  createdAt: string;
  updatedAt: string;
}

export enum ArbitrationStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export const ArbitrationStatusLabels: Record<ArbitrationStatus, string> = {
  [ArbitrationStatus.PENDING]: '待仲裁',
  [ArbitrationStatus.RESOLVED]: '已裁决',
  [ArbitrationStatus.DISMISSED]: '已驳回'
};

export const ArbitrationStatusColors: Record<ArbitrationStatus, string> = {
  [ArbitrationStatus.PENDING]: '#F59E0B',
  [ArbitrationStatus.RESOLVED]: '#10B981',
  [ArbitrationStatus.DISMISSED]: '#6B7280'
};

export enum ArbitrationOutcome {
  ACCEPT_RELATION = 'accept_relation',
  REJECT_RELATION = 'reject_relation',
  REVISE_RELATION = 'revise_relation',
  FURTHER_RESEARCH = 'further_research'
}

export const ArbitrationOutcomeLabels: Record<ArbitrationOutcome, string> = {
  [ArbitrationOutcome.ACCEPT_RELATION]: '采纳关系',
  [ArbitrationOutcome.REJECT_RELATION]: '否决关系',
  [ArbitrationOutcome.REVISE_RELATION]: '修订关系',
  [ArbitrationOutcome.FURTHER_RESEARCH]: '待进一步研究'
};

export interface Arbitration {
  id: string;
  relationId: string;
  fragmentPair: [string, string];
  status: ArbitrationStatus;
  reviews: Review[];
  consensusScore: number;
  supportCount: number;
  opposeCount: number;
  abstainCount: number;
  createdAt: string;
  arbitratedAt?: string;
  arbitratorId?: string;
  outcome?: ArbitrationOutcome;
  arbitrationNotes?: string;
  finalConfidence?: number;
}

export interface ReviewSummary {
  relationId: string;
  fragmentPair: [string, string];
  totalReviews: number;
  supportCount: number;
  opposeCount: number;
  abstainCount: number;
  avgConfidence: number;
  weightedConfidence: number;
  consensusScore: number;
  hasConsensus: boolean;
  needsArbitration: boolean;
  latestReviewAt: string;
}

export interface ReviewTimelineEvent {
  id: string;
  type: 'review' | 'arbitration' | 'relation_change' | 'evidence';
  timestamp: string;
  relationId: string;
  fragmentPair: [string, string];
  researcherId?: string;
  researcherName?: string;
  description: string;
  details?: {
    supportCount?: number;
    opposeCount?: number;
    finalConfidence?: number;
    evidenceTitle?: string;
    evidenceType?: EvidenceAttachmentType;
    markerLabel?: string;
    compareTitle?: string;
    [key: string]: unknown;
  };
}

export enum EvidenceAttachmentType {
  HD_IMAGE = 'hd_image',
  RUBBING = 'rubbing',
  MODEL_3D_SCREENSHOT = 'model_3d_screenshot',
  COMPARISON_MARKUP = 'comparison_markup',
  OTHER = 'other'
}

export const EvidenceAttachmentTypeLabels: Record<EvidenceAttachmentType, string> = {
  [EvidenceAttachmentType.HD_IMAGE]: '高清图片',
  [EvidenceAttachmentType.RUBBING]: '拓片',
  [EvidenceAttachmentType.MODEL_3D_SCREENSHOT]: '3D模型截图',
  [EvidenceAttachmentType.COMPARISON_MARKUP]: '比对标注图',
  [EvidenceAttachmentType.OTHER]: '其他'
};

export const EvidenceAttachmentTypeColors: Record<EvidenceAttachmentType, string> = {
  [EvidenceAttachmentType.HD_IMAGE]: '#2563EB',
  [EvidenceAttachmentType.RUBBING]: '#92400E',
  [EvidenceAttachmentType.MODEL_3D_SCREENSHOT]: '#7C3AED',
  [EvidenceAttachmentType.COMPARISON_MARKUP]: '#059669',
  [EvidenceAttachmentType.OTHER]: '#6B7280'
};

export enum AttachmentTargetType {
  RELATION = 'relation',
  REVIEW = 'review',
  FRAGMENT = 'fragment'
}

export interface AnnotationMarker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  description?: string;
  linkedMarkerId?: string;
}

export interface EvidenceAttachment {
  id: string;
  targetType: AttachmentTargetType;
  targetId: string;
  type: EvidenceAttachmentType;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  markers: AnnotationMarker[];
  uploadedBy: string;
  uploadedByResearcherId?: string;
  createdAt: string;
  updatedAt: string;
  isComparison?: boolean;
  pairedAttachmentId?: string;
  fragmentReferenceIds?: string[];
}

export interface CompareSession {
  id: string;
  title: string;
  leftAttachmentId: string;
  rightAttachmentId: string;
  markers: AnnotationMarker[];
  syncZoom: boolean;
  syncPan: boolean;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface EvidenceFilter {
  targetType?: AttachmentTargetType;
  targetId?: string;
  attachmentTypes?: EvidenceAttachmentType[];
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}
