import {
  Fragment,
  Relation,
  RelationType,
  Researcher,
  Review,
  ReviewVerdict,
  ReviewEvidenceType,
  Arbitration,
  ArbitrationStatus,
  ArbitrationOutcome
} from '@/types';

export const mockResearchers: Researcher[] = [
  {
    id: 'researcher-001',
    name: '李明远',
    title: '教授',
    institution: '清华大学出土文献研究与保护中心',
    specialties: ['甲骨文缀合', '商代史'],
    avatar: '李'
  },
  {
    id: 'researcher-002',
    name: '王博文',
    title: '副教授',
    institution: '北京大学中国古代史研究中心',
    specialties: ['古文字学', '甲骨形态学'],
    avatar: '王'
  },
  {
    id: 'researcher-003',
    name: '张静怡',
    title: '讲师',
    institution: '复旦大学出土文献与古文字研究中心',
    specialties: ['甲骨文语法', '文例研究'],
    avatar: '张'
  },
  {
    id: 'researcher-004',
    name: '陈思远',
    title: '研究员',
    institution: '中国社会科学院历史研究所',
    specialties: ['甲骨辨伪', '断代研究'],
    avatar: '陈'
  },
  {
    id: 'researcher-005',
    name: '刘雅琴',
    title: '副研究员',
    institution: '故宫博物院古文献研究所',
    specialties: ['甲骨缀合', '数字化研究'],
    avatar: '刘'
  }
];

export const mockReviews: Review[] = [
  {
    id: 'review-001',
    relationId: 'rel-001',
    fragmentPair: ['frag-001', 'frag-002'],
    reviewerId: 'researcher-001',
    verdict: ReviewVerdict.SUPPORT,
    confidence: 90,
    evidenceTypes: [ReviewEvidenceType.EDGE_MORPHOLOGY, ReviewEvidenceType.TEXT_CONTINUITY],
    justification: '甲001与甲002的边缘齿痕完全吻合，可确定为同一龟甲的左右两半。文字风格一致，"贞""卜"等字的写法具有同期特征，支持缀合。',
    createdAt: '2024-01-16T11:00:00Z',
    updatedAt: '2024-01-16T11:00:00Z'
  },
  {
    id: 'review-002',
    relationId: 'rel-001',
    fragmentPair: ['frag-001', 'frag-002'],
    reviewerId: 'researcher-002',
    verdict: ReviewVerdict.SUPPORT,
    confidence: 85,
    evidenceTypes: [ReviewEvidenceType.EDGE_MORPHOLOGY, ReviewEvidenceType.SHAPE_MATCH],
    justification: '从形态学角度分析，两残片的厚度、曲率一致，边缘磨损程度相同，支持为同一版龟甲。建议进一步通过3D扫描验证吻合度。',
    createdAt: '2024-01-16T13:30:00Z',
    updatedAt: '2024-01-16T13:30:00Z'
  },
  {
    id: 'review-003',
    relationId: 'rel-001',
    fragmentPair: ['frag-001', 'frag-002'],
    reviewerId: 'researcher-003',
    verdict: ReviewVerdict.SUPPORT,
    confidence: 88,
    evidenceTypes: [ReviewEvidenceType.TEXT_CONTINUITY, ReviewEvidenceType.CONTENT_RELEVANCE],
    justification: '文字可通读，内容为连续的卜辞，涉及"壬子卜，贞"等文例，文例通顺，内容关联度高。',
    createdAt: '2024-01-16T15:00:00Z',
    updatedAt: '2024-01-16T15:00:00Z'
  },
  {
    id: 'review-004',
    relationId: 'rel-005',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-001',
    verdict: ReviewVerdict.OPPOSE,
    confidence: 70,
    evidenceTypes: [ReviewEvidenceType.EDGE_MORPHOLOGY],
    justification: '边缘仅部分吻合，且甲006的厚度明显大于甲001，不支持两者缀合。可能只是巧合的边缘相似。',
    createdAt: '2024-01-18T13:00:00Z',
    updatedAt: '2024-01-18T13:00:00Z'
  },
  {
    id: 'review-005',
    relationId: 'rel-005',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-004',
    verdict: ReviewVerdict.OPPOSE,
    confidence: 75,
    evidenceTypes: [ReviewEvidenceType.HISTORICAL_CONTEXT, ReviewEvidenceType.SHAPE_MATCH],
    justification: '甲001为商代晚期典型风格，而甲006的文字特征更接近中期，断代存在差异。建议对两残片的出土地点作进一步考证。',
    createdAt: '2024-01-18T14:30:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: 'review-006',
    relationId: 'rel-005',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-005',
    verdict: ReviewVerdict.SUGGEST_REVIEW,
    confidence: 55,
    evidenceTypes: [ReviewEvidenceType.EDGE_MORPHOLOGY, ReviewEvidenceType.TEXT_CONTINUITY],
    justification: '虽然边缘吻合度不高，但甲006背面有凿钻痕迹，与甲001的背面特征相似，建议通过高清晰图像进一步比对，暂不下定论。',
    createdAt: '2024-01-18T16:00:00Z',
    updatedAt: '2024-01-18T16:00:00Z'
  },
  {
    id: 'review-007',
    relationId: 'rel-007',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-001',
    verdict: ReviewVerdict.SUPPORT,
    confidence: 92,
    evidenceTypes: [ReviewEvidenceType.TEXT_CONTINUITY, ReviewEvidenceType.CONTENT_RELEVANCE],
    justification: '重新仔细比对后发现，甲001与甲006的文字连续度极高，"王""曰""亡""灾"等字可连读，文例完全通顺，应为同一版卜辞的不同部分。',
    createdAt: '2024-01-19T10:00:00Z',
    updatedAt: '2024-01-19T10:00:00Z'
  },
  {
    id: 'review-008',
    relationId: 'rel-007',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-003',
    verdict: ReviewVerdict.SUPPORT,
    confidence: 88,
    evidenceTypes: [ReviewEvidenceType.TEXT_CONTINUITY, ReviewEvidenceType.HISTORICAL_CONTEXT],
    justification: '从语法结构和文例来看，两残片的内容可构成完整的贞问-答辞结构，这是强有力的证据支持缀合。',
    createdAt: '2024-01-19T11:30:00Z',
    updatedAt: '2024-01-19T11:30:00Z'
  },
  {
    id: 'review-009',
    relationId: 'rel-007',
    fragmentPair: ['frag-001', 'frag-006'],
    reviewerId: 'researcher-004',
    verdict: ReviewVerdict.ABSTAIN,
    confidence: 50,
    evidenceTypes: [ReviewEvidenceType.OTHER],
    justification: '文字连续性证据确实较强，但考虑到之前对边缘吻合度的质疑，建议通过物理比对或3D建模确认边缘是否真正吻合，目前暂不表态。',
    createdAt: '2024-01-19T14:00:00Z',
    updatedAt: '2024-01-19T14:00:00Z'
  }
];

export const mockArbitrations: Arbitration[] = [
  {
    id: 'arbitration-001',
    relationId: 'rel-007',
    fragmentPair: ['frag-001', 'frag-006'],
    status: ArbitrationStatus.PENDING,
    reviews: [mockReviews[6], mockReviews[7], mockReviews[8]],
    consensusScore: 0.66,
    supportCount: 2,
    opposeCount: 0,
    abstainCount: 1,
    createdAt: '2024-01-19T14:30:00Z'
  },
  {
    id: 'arbitration-002',
    relationId: 'rel-001',
    fragmentPair: ['frag-001', 'frag-002'],
    status: ArbitrationStatus.RESOLVED,
    reviews: [mockReviews[0], mockReviews[1], mockReviews[2]],
    consensusScore: 1.0,
    supportCount: 3,
    opposeCount: 0,
    abstainCount: 0,
    createdAt: '2024-01-16T16:00:00Z',
    arbitratedAt: '2024-01-16T17:00:00Z',
    arbitratorId: 'researcher-001',
    outcome: ArbitrationOutcome.ACCEPT_RELATION,
    arbitrationNotes: '三位研究者一致支持此缀合关系，证据充分，包括边缘形态、文字连续性和内容关联性多方面证据。正式采纳此缀合关系，可信度调整为88%。',
    finalConfidence: 88
  },
  {
    id: 'arbitration-003',
    relationId: 'rel-005',
    fragmentPair: ['frag-001', 'frag-006'],
    status: ArbitrationStatus.RESOLVED,
    reviews: [mockReviews[3], mockReviews[4], mockReviews[5]],
    consensusScore: 0.67,
    supportCount: 0,
    opposeCount: 2,
    abstainCount: 1,
    createdAt: '2024-01-18T17:00:00Z',
    arbitratedAt: '2024-01-18T18:00:00Z',
    arbitratorId: 'researcher-002',
    outcome: ArbitrationOutcome.FURTHER_RESEARCH,
    arbitrationNotes: '多数意见对边缘吻合度表示质疑，但有研究者建议复核。决定暂不否决，标记为待进一步研究，待获取更多证据（如3D扫描数据）后再议。',
    finalConfidence: 50
  }
];

export const mockFragments: Fragment[] = [
  {
    id: 'frag-001',
    code: '甲001',
    name: '龟甲残片一',
    description: '商代晚期龟甲，左侧残片，有贞卜文字',
    era: '商代晚期',
    location: '河南安阳殷墟',
    notes: '字迹清晰，边缘较完整',
    isGrouped: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'frag-002',
    code: '甲002',
    name: '龟甲残片二',
    description: '商代晚期龟甲，右侧残片，与甲001疑似缀合',
    era: '商代晚期',
    location: '河南安阳殷墟',
    notes: '边缘有磨损',
    isGrouped: false,
    createdAt: '2024-01-15T10:05:00Z',
    updatedAt: '2024-01-15T10:05:00Z'
  },
  {
    id: 'frag-003',
    code: '甲003',
    name: '牛肩胛骨残片',
    description: '商代牛肩胛骨，记事刻辞',
    era: '商代中期',
    location: '河南安阳小屯',
    notes: '单独残片，暂未发现缀合',
    isGrouped: false,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z'
  },
  {
    id: 'frag-004',
    code: '甲004',
    name: '龟甲残片四',
    description: '龟甲底部残片，有干支表',
    era: '商代晚期',
    location: '河南安阳殷墟',
    notes: '',
    isGrouped: true,
    groupId: 'group-001',
    createdAt: '2024-01-17T14:00:00Z',
    updatedAt: '2024-01-17T14:00:00Z'
  },
  {
    id: 'frag-005',
    code: '甲005',
    name: '龟甲残片五',
    description: '龟甲上部残片，与甲004组成完整龟甲',
    era: '商代晚期',
    location: '河南安阳殷墟',
    notes: '已定组',
    isGrouped: true,
    groupId: 'group-001',
    createdAt: '2024-01-17T14:05:00Z',
    updatedAt: '2024-01-17T14:05:00Z'
  },
  {
    id: 'frag-006',
    code: '甲006',
    name: '龟甲残片六',
    description: '与甲001有争议的缀合关系',
    era: '商代晚期',
    location: '河南安阳殷墟',
    notes: '存在不同观点',
    isGrouped: false,
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z'
  }
];

export const mockRelations: Relation[] = [
  {
    id: 'rel-001',
    sourceId: 'frag-001',
    targetId: 'frag-002',
    type: RelationType.EDGE_MATCH,
    confidence: 85,
    notes: '边缘吻合度较高，文字风格一致',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 'rel-001b',
    sourceId: 'frag-001',
    targetId: 'frag-002',
    type: RelationType.EDGE_MATCH,
    confidence: 82,
    notes: '王研究员独立复核：边缘齿痕完全对应，可确定为同一块龟甲',
    createdAt: '2024-01-16T14:20:00Z',
    updatedAt: '2024-01-16T14:20:00Z'
  },
  {
    id: 'rel-002',
    sourceId: 'frag-001',
    targetId: 'frag-002',
    type: RelationType.TEXT_CONTINUITY,
    confidence: 75,
    notes: '文字有连续性，文例可通',
    createdAt: '2024-01-16T10:05:00Z',
    updatedAt: '2024-01-16T10:05:00Z'
  },
  {
    id: 'rel-003',
    sourceId: 'frag-004',
    targetId: 'frag-005',
    type: RelationType.EDGE_MATCH,
    confidence: 95,
    notes: '边缘完全吻合，是同一龟甲的两部分',
    createdAt: '2024-01-17T15:00:00Z',
    updatedAt: '2024-01-17T15:00:00Z'
  },
  {
    id: 'rel-004',
    sourceId: 'frag-004',
    targetId: 'frag-005',
    type: RelationType.TEXT_CONTINUITY,
    confidence: 92,
    notes: '文字完全连续，内容可通读',
    createdAt: '2024-01-17T15:05:00Z',
    updatedAt: '2024-01-17T15:05:00Z'
  },
  {
    id: 'rel-005',
    sourceId: 'frag-001',
    targetId: 'frag-006',
    type: RelationType.EDGE_MATCH,
    confidence: 60,
    notes: '边缘部分吻合，存在争议',
    createdAt: '2024-01-18T12:00:00Z',
    updatedAt: '2024-01-18T12:00:00Z'
  },
  {
    id: 'rel-006',
    sourceId: 'frag-001',
    targetId: 'frag-006',
    type: RelationType.CONTENT_ASSOCIATION,
    confidence: 45,
    notes: '内容关联度不高，存疑',
    createdAt: '2024-01-18T12:05:00Z',
    updatedAt: '2024-01-18T12:05:00Z'
  },
  {
    id: 'rel-007',
    sourceId: 'frag-001',
    targetId: 'frag-006',
    type: RelationType.TEXT_CONTINUITY,
    confidence: 90,
    notes: '李教授独立研究：文字连续度极高，文例通顺，应为同一版卜辞',
    createdAt: '2024-01-19T09:30:00Z',
    updatedAt: '2024-01-19T09:30:00Z'
  }
];
