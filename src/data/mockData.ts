import { Fragment, Relation, RelationType } from '@/types';

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
