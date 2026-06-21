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

export interface AnalysisResult {
  totalFragments: number;
  totalRelations: number;
  isolatedFragments: Fragment[];
  conflictingRelationGroups: Relation[][];
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
