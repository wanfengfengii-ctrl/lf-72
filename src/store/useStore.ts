import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Fragment,
  Relation,
  RelationType,
  NodePositionsMap,
  GroupingValidationResult,
  OperationType,
  OperationRecord,
  VersionSnapshot,
  VersionDiff,
  FieldChange,
  OperationTarget,
  HistoryFilter,
  Review,
  ReviewVerdict,
  Researcher,
  Arbitration,
  ArbitrationStatus,
  ArbitrationOutcome,
  ReviewSummary,
  ReviewTimelineEvent,
  ReviewEvidenceType,
  EvidenceAttachment,
  EvidenceAttachmentType,
  AttachmentTargetType,
  AnnotationMarker,
  CompareSession,
  EvidenceFilter
} from '@/types';
import { validateFragmentCode, validateAddRelation, validateGrouping, validateGroupingDetailed } from '@/utils/validation';
import { analyzeNetwork } from '@/utils/analysis';
import {
  mockFragments,
  mockRelations,
  mockResearchers,
  mockReviews,
  mockArbitrations,
  mockEvidenceAttachments,
  mockCompareSessions
} from '@/data/mockData';

const generateId = () => Math.random().toString(36).substring(2, 11);

const simpleChecksum = (obj: unknown): string => {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const calculateFieldChanges = <T extends object>(oldObj: T, newObj: T, fields: string[], labels?: Record<string, string>): FieldChange[] => {
  const changes: FieldChange[] = [];
  const oldRec = oldObj as Record<string, unknown>;
  const newRec = newObj as Record<string, unknown>;
  for (const field of fields) {
    const oldVal = oldRec[field];
    const newVal = newRec[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
        label: labels?.[field] || field
      });
    }
  }
  return changes;
};

const FRAGMENT_FIELDS = ['code', 'name', 'description', 'era', 'location', 'notes', 'isGrouped', 'groupId'];
const FRAGMENT_FIELD_LABELS: Record<string, string> = {
  code: '编号',
  name: '名称',
  description: '描述',
  era: '年代',
  location: '出土地',
  notes: '备注',
  isGrouped: '定组状态',
  groupId: '定组编号'
};
const RELATION_FIELDS = ['sourceId', 'targetId', 'type', 'confidence', 'notes'];
const RELATION_FIELD_LABELS: Record<string, string> = {
  sourceId: '源残片',
  targetId: '目标残片',
  type: '关系类型',
  confidence: '可信度',
  notes: '备注'
};

const DEFAULT_OPERATOR = '研究人员';

interface AppState {
  fragments: Fragment[];
  relations: Relation[];
  nodePositions: NodePositionsMap;
  selectedFragmentId: string | null;
  selectedRelationId: string | null;
  searchKeyword: string;
  filterType: RelationType | 'all';
  filterConfidenceMin: number;

  history: OperationRecord[];
  snapshots: VersionSnapshot[];
  currentVersion: number;
  historyFilter: HistoryFilter;

  addFragment: (data: Omit<Fragment, 'id' | 'createdAt' | 'updatedAt' | 'isGrouped'>, note?: string) => { success: boolean; message: string };
  updateFragment: (id: string, data: Partial<Fragment>, note?: string) => { success: boolean; message: string };
  deleteFragment: (id: string, note?: string) => void;
  selectFragment: (id: string | null) => void;

  addRelation: (data: Omit<Relation, 'id' | 'createdAt' | 'updatedAt'>, note?: string) => { success: boolean; message: string };
  updateRelation: (id: string, data: Partial<Relation>, note?: string) => { success: boolean; message: string };
  deleteRelation: (id: string, note?: string) => void;
  selectRelation: (id: string | null) => void;

  setNodePosition: (id: string, position: { x: number; y: number }) => void;
  setNodePositions: (positions: NodePositionsMap) => void;
  clearNodePositions: () => void;
  resetNodePositionsToDefault: () => void;

  setSearchKeyword: (keyword: string) => void;
  setFilterType: (type: RelationType | 'all') => void;
  setFilterConfidenceMin: (value: number) => void;

  toggleGrouped: (fragmentId: string, note?: string) => { success: boolean; message: string };
  validateGroupingForFragment: (fragmentId: string) => GroupingValidationResult;

  getAnalysis: () => ReturnType<typeof analyzeNetwork>;

  recordOperation: (
    type: OperationType,
    targets: OperationTarget[],
    changes: FieldChange[],
    description: string,
    note?: string
  ) => void;

  restoreVersion: (version: number, note?: string) => { success: boolean; message: string };
  compareVersions: (versionA: number, versionB: number) => VersionDiff | null;
  getSnapshotByVersion: (version: number) => VersionSnapshot | null;

  setHistoryFilter: (filter: Partial<HistoryFilter>) => void;
  clearHistoryFilter: () => void;
  getFilteredHistory: () => OperationRecord[];

  addNoteToOperation: (operationId: string, note: string) => void;

  researchers: Researcher[];
  currentResearcherId: string;
  reviews: Review[];
  arbitrations: Arbitration[];

  setCurrentResearcher: (researcherId: string) => void;

  addReview: (data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; message: string };
  updateReview: (id: string, data: Partial<Review>) => { success: boolean; message: string };
  deleteReview: (id: string) => void;
  getReviewsForRelation: (relationId: string) => Review[];
  getReviewsByResearcher: (researcherId: string) => Review[];

  calculateReviewSummary: (relationId: string) => ReviewSummary | null;
  getAllReviewSummaries: () => ReviewSummary[];
  getPendingArbitrations: () => Arbitration[];
  getResolvedArbitrations: () => Arbitration[];

  createArbitration: (relationId: string) => { success: boolean; message: string; arbitrationId?: string };
  resolveArbitration: (
    arbitrationId: string,
    outcome: ArbitrationOutcome,
    notes: string,
    finalConfidence?: number
  ) => { success: boolean; message: string };
  dismissArbitration: (arbitrationId: string, notes: string) => { success: boolean; message: string };
  getArbitrationForRelation: (relationId: string) => Arbitration | null;

  getReviewTimeline: () => ReviewTimelineEvent[];
  getReviewTimelineForRelation: (relationId: string) => ReviewTimelineEvent[];

  evidenceAttachments: EvidenceAttachment[];
  compareSessions: CompareSession[];
  evidenceFilter: EvidenceFilter;

  addEvidenceAttachment: (
    data: Omit<EvidenceAttachment, 'id' | 'createdAt' | 'updatedAt' | 'markers' | 'uploadedBy' | 'uploadedByResearcherId'>,
    note?: string
  ) => { success: boolean; message: string; attachmentId?: string };
  updateEvidenceAttachment: (
    id: string,
    data: Partial<Pick<EvidenceAttachment, 'title' | 'description' | 'type' | 'fragmentReferenceIds'>>,
    note?: string
  ) => { success: boolean; message: string };
  deleteEvidenceAttachment: (id: string, note?: string) => { success: boolean; message: string };
  getEvidenceForTarget: (targetType: AttachmentTargetType, targetId: string) => EvidenceAttachment[];
  getEvidenceForRelation: (relationId: string) => EvidenceAttachment[];
  getEvidenceForFragment: (fragmentId: string) => EvidenceAttachment[];
  getEvidenceForReview: (reviewId: string) => EvidenceAttachment[];
  getAllEvidence: () => EvidenceAttachment[];
  setEvidenceFilter: (filter: Partial<EvidenceFilter>) => void;
  clearEvidenceFilter: () => void;
  getFilteredEvidence: () => EvidenceAttachment[];

  addMarkerToAttachment: (
    attachmentId: string,
    marker: Omit<AnnotationMarker, 'id'>,
    note?: string
  ) => { success: boolean; message: string; markerId?: string };
  updateMarker: (
    attachmentId: string,
    markerId: string,
    data: Partial<Omit<AnnotationMarker, 'id'>>
  ) => { success: boolean; message: string };
  deleteMarker: (attachmentId: string, markerId: string) => { success: boolean; message: string };

  createCompareSession: (
    data: Omit<CompareSession, 'id' | 'createdAt' | 'createdBy' | 'markers'>,
    note?: string
  ) => { success: boolean; message: string; sessionId?: string };
  deleteCompareSession: (sessionId: string) => { success: boolean; message: string };
  getCompareSessionsForTarget: (targetId?: string) => CompareSession[];
  addMarkerToCompareSession: (
    sessionId: string,
    marker: Omit<AnnotationMarker, 'id'>
  ) => { success: boolean; message: string; markerId?: string };
  updateCompareSessionMarker: (
    sessionId: string,
    markerId: string,
    data: Partial<Omit<AnnotationMarker, 'id'>>
  ) => { success: boolean; message: string };
  deleteCompareSessionMarker: (sessionId: string, markerId: string) => { success: boolean; message: string };
  toggleCompareSync: (sessionId: string, syncType: 'zoom' | 'pan') => void;
  updateCompareSessionNotes: (sessionId: string, notes: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const initialVersion = 1;
      const initialSnapshotId = `snap-${generateId()}`;
      const initialOperationId = `op-${generateId()}`;
      const initialTimestamp = new Date().toISOString();
      const initialSnapshot: VersionSnapshot = {
        id: initialSnapshotId,
        version: initialVersion,
        timestamp: initialTimestamp,
        fragments: JSON.parse(JSON.stringify(mockFragments)),
        relations: JSON.parse(JSON.stringify(mockRelations)),
        nodePositions: {},
        operationId: initialOperationId,
        checksum: simpleChecksum({ fragments: mockFragments, relations: mockRelations, nodePositions: {} })
      };
      const initialHistory: OperationRecord = {
        id: initialOperationId,
        version: initialVersion,
        type: OperationType.BATCH_OPERATION,
        timestamp: initialTimestamp,
        operator: DEFAULT_OPERATOR,
        targets: [{ type: 'system' }],
        changes: [],
        description: '系统初始化，加载示例数据',
        note: '初始版本',
        snapshotId: initialSnapshotId
      };

      return {
        fragments: mockFragments,
        relations: mockRelations,
        nodePositions: {},
        selectedFragmentId: null,
        selectedRelationId: null,
        searchKeyword: '',
        filterType: 'all',
        filterConfidenceMin: 0,

        history: [initialHistory],
        snapshots: [initialSnapshot],
        currentVersion: initialVersion,
        historyFilter: {},

        researchers: JSON.parse(JSON.stringify(mockResearchers)),
        currentResearcherId: 'researcher-001',
        reviews: JSON.parse(JSON.stringify(mockReviews)),
        arbitrations: JSON.parse(JSON.stringify(mockArbitrations)),

        evidenceAttachments: JSON.parse(JSON.stringify(mockEvidenceAttachments)),
        compareSessions: JSON.parse(JSON.stringify(mockCompareSessions)),
        evidenceFilter: {},

        addFragment: (data, note) => {
          const { fragments, recordOperation } = get();
          const validation = validateFragmentCode(data.code, fragments);
          if (!validation.valid) {
            return { success: false, message: validation.message };
          }

          const now = new Date().toISOString();
          const newFragment: Fragment = {
            ...data,
            id: `frag-${generateId()}`,
            isGrouped: false,
            createdAt: now,
            updatedAt: now
          };

          const targets: OperationTarget[] = [{
            type: 'fragment',
            id: newFragment.id,
            code: newFragment.code,
            name: newFragment.name
          }];
          const changes: FieldChange[] = [
            { field: 'code', newValue: newFragment.code, label: '编号' },
            { field: 'name', newValue: newFragment.name, label: '名称' }
          ];
          const description = `新增残片 [${newFragment.code}] ${newFragment.name}`;

          set({ fragments: [...fragments, newFragment] });
          recordOperation(OperationType.FRAGMENT_ADD, targets, changes, description, note);
          return { success: true, message: '残片添加成功' };
        },

        updateFragment: (id, data, note) => {
          const { fragments, recordOperation } = get();

          if (data.code !== undefined) {
            const validation = validateFragmentCode(data.code, fragments, id);
            if (!validation.valid) {
              return { success: false, message: validation.message };
            }
          }

          const oldFragment = fragments.find((f) => f.id === id);
          if (!oldFragment) {
            return { success: false, message: '残片不存在' };
          }

          const updatedFragment: Fragment = { ...oldFragment, ...data, updatedAt: new Date().toISOString() };
          const changes = calculateFieldChanges(oldFragment, updatedFragment, FRAGMENT_FIELDS, FRAGMENT_FIELD_LABELS);

          if (changes.length === 0) {
            return { success: true, message: '无变更内容' };
          }

          const updatedFragments = fragments.map((f) => f.id === id ? updatedFragment : f);

          let opType = OperationType.FRAGMENT_UPDATE;
          if (changes.every((c) => c.field === 'notes')) {
            opType = OperationType.NOTES_UPDATE;
          } else if (changes.some((c) => c.field === 'isGrouped')) {
            opType = OperationType.FRAGMENT_GROUP_TOGGLE;
          }

          const targets: OperationTarget[] = [{
            type: 'fragment',
            id: oldFragment.id,
            code: updatedFragment.code,
            name: updatedFragment.name
          }];
          const description = `更新残片 [${updatedFragment.code}] ${changes.map((c) => `${c.label}:${String(c.oldValue)}→${String(c.newValue)}`).join(', ')}`;

          set({ fragments: updatedFragments });
          recordOperation(opType, targets, changes, description, note);
          return { success: true, message: '残片更新成功' };
        },

        deleteFragment: (id, note) => {
          const { fragments, relations, selectedFragmentId, nodePositions, recordOperation } = get();
          const oldFragment = fragments.find((f) => f.id === id);

          const filteredFragments = fragments.filter((f) => f.id !== id);
          const filteredRelations = relations.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          );
          const newNodePositions = { ...nodePositions };
          delete newNodePositions[id];

          set({
            fragments: filteredFragments,
            relations: filteredRelations,
            selectedFragmentId: selectedFragmentId === id ? null : selectedFragmentId,
            nodePositions: newNodePositions
          });

          if (oldFragment) {
            const targets: OperationTarget[] = [{
              type: 'fragment',
              id: oldFragment.id,
              code: oldFragment.code,
              name: oldFragment.name
            }];
            const changes: FieldChange[] = [
              { field: 'id', oldValue: oldFragment.id, label: '标识' },
              { field: 'code', oldValue: oldFragment.code, label: '编号' }
            ];
            const description = `删除残片 [${oldFragment.code}] ${oldFragment.name}`;
            recordOperation(OperationType.FRAGMENT_DELETE, targets, changes, description, note);
          }
        },

        selectFragment: (id) => {
          set({ selectedFragmentId: id, selectedRelationId: null });
        },

        addRelation: (data, note) => {
          const { relations, fragments, recordOperation } = get();
          const validation = validateAddRelation(
            data.sourceId,
            data.targetId,
            data.type,
            data.confidence,
            data.notes,
            relations
          );

          if (!validation.valid) {
            return { success: false, message: validation.message };
          }

          const now = new Date().toISOString();
          const newRelation: Relation = {
            ...data,
            id: `rel-${generateId()}`,
            createdAt: now,
            updatedAt: now
          };

          const sourceFrag = fragments.find((f) => f.id === data.sourceId);
          const targetFrag = fragments.find((f) => f.id === data.targetId);
          const targets: OperationTarget[] = [
            { type: 'fragment', id: data.sourceId, code: sourceFrag?.code, name: sourceFrag?.name },
            { type: 'fragment', id: data.targetId, code: targetFrag?.code, name: targetFrag?.name }
          ];
          const changes: FieldChange[] = [
            { field: 'type', newValue: data.type, label: '关系类型' },
            { field: 'confidence', newValue: data.confidence, label: '可信度' },
            { field: 'notes', newValue: data.notes, label: '备注' }
          ];
          const description = `新增缀合关系 [${sourceFrag?.code || data.sourceId}] ↔ [${targetFrag?.code || data.targetId}]`;

          set({ relations: [...relations, newRelation] });
          recordOperation(OperationType.RELATION_ADD, targets, changes, description, note);
          return { success: true, message: '缀合关系添加成功' };
        },

        updateRelation: (id, data, note) => {
          const { relations, fragments, recordOperation } = get();
          const existing = relations.find((r) => r.id === id);
          if (!existing) {
            return { success: false, message: '关系不存在' };
          }

          const sourceId = data.sourceId ?? existing.sourceId;
          const targetId = data.targetId ?? existing.targetId;
          const type = data.type ?? existing.type;
          const confidence = data.confidence ?? existing.confidence;

          const validation = validateAddRelation(
            sourceId,
            targetId,
            type,
            confidence,
            data.notes ?? existing.notes,
            relations,
            id
          );

          if (!validation.valid) {
            return { success: false, message: validation.message };
          }

          const updatedRelation: Relation = { ...existing, ...data, updatedAt: new Date().toISOString() };
          const changes = calculateFieldChanges(existing, updatedRelation, RELATION_FIELDS, RELATION_FIELD_LABELS);

          if (changes.length === 0) {
            return { success: true, message: '无变更内容' };
          }

          let opType = OperationType.RELATION_UPDATE;
          if (changes.length === 1 && changes[0].field === 'confidence') {
            opType = OperationType.RELATION_CONFIDENCE_CHANGE;
          } else if (changes.every((c) => c.field === 'notes')) {
            opType = OperationType.NOTES_UPDATE;
          }

          const sourceFrag = fragments.find((f) => f.id === sourceId);
          const targetFrag = fragments.find((f) => f.id === targetId);
          const targets: OperationTarget[] = [
            { type: 'relation', id: existing.id },
            { type: 'fragment', id: sourceId, code: sourceFrag?.code, name: sourceFrag?.name },
            { type: 'fragment', id: targetId, code: targetFrag?.code, name: targetFrag?.name }
          ];
          const description = `更新缀合关系 [${sourceFrag?.code || sourceId}] ↔ [${targetFrag?.code || targetId}]: ${changes.map((c) => `${c.label}:${String(c.oldValue)}→${String(c.newValue)}`).join(', ')}`;

          const updatedRelations = relations.map((r) => r.id === id ? updatedRelation : r);
          set({ relations: updatedRelations });
          recordOperation(opType, targets, changes, description, note);
          return { success: true, message: '缀合关系更新成功' };
        },

        deleteRelation: (id, note) => {
          const { relations, selectedRelationId, fragments, recordOperation } = get();
          const oldRelation = relations.find((r) => r.id === id);

          set({
            relations: relations.filter((r) => r.id !== id),
            selectedRelationId: selectedRelationId === id ? null : selectedRelationId
          });

          if (oldRelation) {
            const sourceFrag = fragments.find((f) => f.id === oldRelation.sourceId);
            const targetFrag = fragments.find((f) => f.id === oldRelation.targetId);
            const targets: OperationTarget[] = [
              { type: 'relation', id: oldRelation.id },
              { type: 'fragment', id: oldRelation.sourceId, code: sourceFrag?.code, name: sourceFrag?.name },
              { type: 'fragment', id: oldRelation.targetId, code: targetFrag?.code, name: targetFrag?.name }
            ];
            const changes: FieldChange[] = [
              { field: 'id', oldValue: oldRelation.id, label: '关系标识' },
              { field: 'type', oldValue: oldRelation.type, label: '关系类型' }
            ];
            const description = `删除缀合关系 [${sourceFrag?.code || oldRelation.sourceId}] ↔ [${targetFrag?.code || oldRelation.targetId}]`;
            recordOperation(OperationType.RELATION_DELETE, targets, changes, description, note);
          }
        },

        selectRelation: (id) => {
          set({ selectedRelationId: id, selectedFragmentId: null });
        },

        setNodePosition: (id, position) => {
          const { nodePositions } = get();
          set({
            nodePositions: {
              ...nodePositions,
              [id]: position
            }
          });
        },

        setNodePositions: (positions) => {
          set({ nodePositions: positions });
        },

        clearNodePositions: () => {
          set({ nodePositions: {} });
        },

        resetNodePositionsToDefault: () => {
          const { fragments } = get();
          const positions: NodePositionsMap = {};
          const centerX = 400;
          const centerY = 300;
          const radius = 200;

          fragments.forEach((fragment, index) => {
            const angle = (index / Math.max(fragments.length, 1)) * 2 * Math.PI - Math.PI / 2;
            positions[fragment.id] = {
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle)
            };
          });

          set({ nodePositions: positions });
        },

        setSearchKeyword: (keyword) => {
          set({ searchKeyword: keyword });
        },

        setFilterType: (type) => {
          set({ filterType: type });
        },

        setFilterConfidenceMin: (value) => {
          set({ filterConfidenceMin: value });
        },

        toggleGrouped: (fragmentId, note) => {
          const { fragments, recordOperation } = get();
          const fragment = fragments.find((f) => f.id === fragmentId);
          if (!fragment) {
            return { success: false, message: '残片不存在' };
          }

          if (!fragment.isGrouped) {
            const validation = get().validateGroupingForFragment(fragmentId);
            if (!validation.valid) {
              return { success: false, message: validation.message };
            }
          }

          const newGrouped = !fragment.isGrouped;
          const changes: FieldChange[] = [{
            field: 'isGrouped',
            oldValue: fragment.isGrouped,
            newValue: newGrouped,
            label: '定组状态'
          }];
          const targets: OperationTarget[] = [{
            type: 'fragment',
            id: fragment.id,
            code: fragment.code,
            name: fragment.name
          }];
          const description = `${newGrouped ? '标记' : '取消'}定组 [${fragment.code}] ${fragment.name}`;

          const updatedFragments = fragments.map((f) =>
            f.id === fragmentId
              ? { ...f, isGrouped: newGrouped, updatedAt: new Date().toISOString() }
              : f
          );

          set({ fragments: updatedFragments });
          recordOperation(OperationType.FRAGMENT_GROUP_TOGGLE, targets, changes, description, note);
          return {
            success: true,
            message: newGrouped ? '已标记为已定组' : '已取消定组'
          };
        },

        validateGroupingForFragment: (fragmentId) => {
          const { fragments, relations } = get();
          return validateGroupingDetailed(fragmentId, fragments, relations);
        },

        getAnalysis: () => {
          const { fragments, relations } = get();
          return analyzeNetwork(fragments, relations);
        },

        recordOperation: (type, targets, changes, description, note) => {
          const state = get();
          const newVersion = state.currentVersion + 1;
          const operationId = `op-${generateId()}`;
          const snapshotId = `snap-${generateId()}`;
          const timestamp = new Date().toISOString();

          const snapshot: VersionSnapshot = {
            id: snapshotId,
            version: newVersion,
            timestamp,
            fragments: JSON.parse(JSON.stringify(state.fragments)),
            relations: JSON.parse(JSON.stringify(state.relations)),
            nodePositions: JSON.parse(JSON.stringify(state.nodePositions)),
            operationId,
            checksum: simpleChecksum({
              fragments: state.fragments,
              relations: state.relations,
              nodePositions: state.nodePositions
            })
          };

          const record: OperationRecord = {
            id: operationId,
            version: newVersion,
            type,
            timestamp,
            operator: DEFAULT_OPERATOR,
            targets,
            changes,
            description,
            note,
            snapshotId
          };

          set({
            history: [...state.history, record],
            snapshots: [...state.snapshots, snapshot],
            currentVersion: newVersion
          });
        },

        restoreVersion: (version, note) => {
          const state = get();
          const snapshot = state.snapshots.find((s) => s.version === version);
          if (!snapshot) {
            return { success: false, message: '版本不存在' };
          }

          const targets: OperationTarget[] = [{ type: 'system' }];
          const changes: FieldChange[] = [
            { field: 'version', oldValue: state.currentVersion, newValue: version, label: '版本号' }
          ];
          const description = `恢复到版本 v${version}（原版本 v${state.currentVersion}）`;

          const restoredFragments = JSON.parse(JSON.stringify(snapshot.fragments));
          const restoredRelations = JSON.parse(JSON.stringify(snapshot.relations));
          const restoredPositions = JSON.parse(JSON.stringify(snapshot.nodePositions));

          const newVersion = state.currentVersion + 1;
          const operationId = `op-${generateId()}`;
          const snapshotId = `snap-${generateId()}`;
          const timestamp = new Date().toISOString();

          const newSnapshot: VersionSnapshot = {
            id: snapshotId,
            version: newVersion,
            timestamp,
            fragments: restoredFragments,
            relations: restoredRelations,
            nodePositions: restoredPositions,
            operationId,
            checksum: simpleChecksum({
              fragments: restoredFragments,
              relations: restoredRelations,
              nodePositions: restoredPositions
            })
          };

          const restoreRecord: OperationRecord = {
            id: operationId,
            version: newVersion,
            type: OperationType.VERSION_RESTORE,
            timestamp,
            operator: DEFAULT_OPERATOR,
            targets,
            changes,
            description,
            note: note || `从 v${version} 恢复`,
            snapshotId
          };

          set({
            fragments: restoredFragments,
            relations: restoredRelations,
            nodePositions: restoredPositions,
            history: [...state.history, restoreRecord],
            snapshots: [...state.snapshots, newSnapshot],
            currentVersion: newVersion,
            selectedFragmentId: null,
            selectedRelationId: null
          });

          return { success: true, message: `已恢复到版本 v${version}` };
        },

        compareVersions: (versionA, versionB) => {
          const state = get();
          const snapA = state.snapshots.find((s) => s.version === versionA);
          const snapB = state.snapshots.find((s) => s.version === versionB);
          if (!snapA || !snapB) return null;

          const fragMapA = new Map(snapA.fragments.map((f) => [f.id, f]));
          const fragMapB = new Map(snapB.fragments.map((f) => [f.id, f]));
          const allFragIds = new Set([...fragMapA.keys(), ...fragMapB.keys()]);

          const fragmentsAdded: Fragment[] = [];
          const fragmentsRemoved: Fragment[] = [];
          const fragmentsModified: Array<{ old: Fragment; new: Fragment; changes: FieldChange[] }> = [];

          for (const id of allFragIds) {
            const a = fragMapA.get(id);
            const b = fragMapB.get(id);
            if (a && !b) fragmentsRemoved.push(a);
            else if (!a && b) fragmentsAdded.push(b);
            else if (a && b) {
              const changes = calculateFieldChanges(a, b, FRAGMENT_FIELDS, FRAGMENT_FIELD_LABELS);
              if (changes.length > 0) {
                fragmentsModified.push({ old: a, new: b, changes });
              }
            }
          }

          const relMapA = new Map(snapA.relations.map((r) => [r.id, r]));
          const relMapB = new Map(snapB.relations.map((r) => [r.id, r]));
          const allRelIds = new Set([...relMapA.keys(), ...relMapB.keys()]);

          const relationsAdded: Relation[] = [];
          const relationsRemoved: Relation[] = [];
          const relationsModified: Array<{ old: Relation; new: Relation; changes: FieldChange[] }> = [];

          for (const id of allRelIds) {
            const a = relMapA.get(id);
            const b = relMapB.get(id);
            if (a && !b) relationsRemoved.push(a);
            else if (!a && b) relationsAdded.push(b);
            else if (a && b) {
              const changes = calculateFieldChanges(a, b, RELATION_FIELDS, RELATION_FIELD_LABELS);
              if (changes.length > 0) {
                relationsModified.push({ old: a, new: b, changes });
              }
            }
          }

          return {
            versionA,
            versionB,
            fragmentsAdded,
            fragmentsRemoved,
            fragmentsModified,
            relationsAdded,
            relationsRemoved,
            relationsModified,
            summary: {
              totalChanges:
                fragmentsAdded.length + fragmentsRemoved.length + fragmentsModified.length +
                relationsAdded.length + relationsRemoved.length + relationsModified.length,
              fragmentChanges: fragmentsAdded.length + fragmentsRemoved.length + fragmentsModified.length,
              relationChanges: relationsAdded.length + relationsRemoved.length + relationsModified.length
            }
          };
        },

        getSnapshotByVersion: (version) => {
          return get().snapshots.find((s) => s.version === version) || null;
        },

        setHistoryFilter: (filter) => {
          set({ historyFilter: { ...get().historyFilter, ...filter } });
        },

        clearHistoryFilter: () => {
          set({ historyFilter: {} });
        },

        getFilteredHistory: () => {
          const { history, historyFilter } = get();
          const filter = historyFilter;
          return history.filter((record) => {
            if (filter.operationTypes && filter.operationTypes.length > 0) {
              if (!filter.operationTypes.includes(record.type)) return false;
            }
            if (filter.targetType && filter.targetType !== 'all') {
              if (!record.targets.some((t) => t.type === filter.targetType)) return false;
            }
            if (filter.targetId) {
              if (!record.targets.some((t) => t.id === filter.targetId)) return false;
            }
            if (filter.dateFrom) {
              if (record.timestamp < filter.dateFrom) return false;
            }
            if (filter.dateTo) {
              if (record.timestamp > filter.dateTo) return false;
            }
            if (filter.operator) {
              if (!record.operator.includes(filter.operator)) return false;
            }
            return true;
          }).reverse();
        },

        addNoteToOperation: (operationId, note) => {
          const { history } = get();
          set({
            history: history.map((r) =>
              r.id === operationId ? { ...r, note } : r
            )
          });
        },

        setCurrentResearcher: (researcherId) => {
          set({ currentResearcherId: researcherId });
        },

        addReview: (data) => {
          const { reviews, relations, researchers, currentResearcherId } = get();
          const relation = relations.find((r) => r.id === data.relationId);
          if (!relation) {
            return { success: false, message: '关系不存在' };
          }
          const reviewer = researchers.find((r) => r.id === data.reviewerId);
          if (!reviewer) {
            return { success: false, message: '研究人员不存在' };
          }
          const existingReview = reviews.find(
            (r) => r.relationId === data.relationId && r.reviewerId === data.reviewerId
          );
          if (existingReview) {
            return { success: false, message: '您已对此关系提交过评议，可编辑修改' };
          }
          const now = new Date().toISOString();
          const newReview: Review = {
            ...data,
            id: `review-${generateId()}`,
            createdAt: now,
            updatedAt: now
          };
          set({ reviews: [...reviews, newReview] });
          const sourceFrag = relation.sourceId;
          const targetFrag = relation.targetId;
          const targets: OperationTarget[] = [
            { type: 'relation', id: relation.id },
            { type: 'fragment', id: sourceFrag },
            { type: 'fragment', id: targetFrag }
          ];
          const changes: FieldChange[] = [
            { field: 'verdict', newValue: data.verdict, label: '评议结论' },
            { field: 'confidence', newValue: data.confidence, label: '可信度' },
            { field: 'justification', newValue: data.justification, label: '依据说明' }
          ];
          const description = `提交评议 [${reviewer.name}] 对缀合关系的评议：${data.verdict === 'support' ? '支持' : data.verdict === 'oppose' ? '反对' : data.verdict === 'abstain' ? '弃权' : '建议复核'}`;
          get().recordOperation(OperationType.NOTES_UPDATE, targets, changes, description, `可信度：${data.confidence}%`);
          return { success: true, message: '评议提交成功' };
        },

        updateReview: (id, data) => {
          const { reviews, researchers, currentResearcherId } = get();
          const existing = reviews.find((r) => r.id === id);
          if (!existing) {
            return { success: false, message: '评议不存在' };
          }
          const updatedReview: Review = { ...existing, ...data, updatedAt: new Date().toISOString() };
          const updatedReviews = reviews.map((r) => r.id === id ? updatedReview : r);
          set({ reviews: updatedReviews });
          const reviewer = researchers.find((r) => r.id === existing.reviewerId);
          const changes: FieldChange[] = [];
          if (data.verdict !== undefined && data.verdict !== existing.verdict) {
            changes.push({ field: 'verdict', oldValue: existing.verdict, newValue: data.verdict, label: '评议结论' });
          }
          if (data.confidence !== undefined && data.confidence !== existing.confidence) {
            changes.push({ field: 'confidence', oldValue: existing.confidence, newValue: data.confidence, label: '可信度' });
          }
          if (data.justification !== undefined && data.justification !== existing.justification) {
            changes.push({ field: 'justification', newValue: data.justification, label: '依据说明' });
          }
          if (changes.length > 0) {
            const targets: OperationTarget[] = [{ type: 'relation', id: existing.relationId }];
            const description = `更新评议 [${reviewer?.name || existing.reviewerId}] 的评议`;
            get().recordOperation(OperationType.NOTES_UPDATE, targets, changes, description);
          }
          return { success: true, message: '评议更新成功' };
        },

        deleteReview: (id) => {
          const { reviews } = get();
          set({ reviews: reviews.filter((r) => r.id !== id) });
        },

        getReviewsForRelation: (relationId) => {
          return get().reviews.filter((r) => r.relationId === relationId);
        },

        getReviewsByResearcher: (researcherId) => {
          return get().reviews.filter((r) => r.reviewerId === researcherId);
        },

        calculateReviewSummary: (relationId) => {
          const { reviews, relations } = get();
          const relation = relations.find((r) => r.id === relationId);
          if (!relation) return null;
          const relationReviews = reviews.filter((r) => r.relationId === relationId);
          if (relationReviews.length === 0) return null;
          const supportCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.SUPPORT).length;
          const opposeCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.OPPOSE).length;
          const abstainCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.ABSTAIN).length;
          const suggestCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.SUGGEST_REVIEW).length;
          const avgConfidence = relationReviews.reduce((sum, r) => sum + r.confidence, 0) / relationReviews.length;
          const weightedConfidence = relationReviews.reduce((sum, r) => {
            const weight = r.verdict === ReviewVerdict.SUPPORT ? 1 : r.verdict === ReviewVerdict.OPPOSE ? -1 : 0.5;
            return sum + r.confidence * weight;
          }, 0) / relationReviews.length;
          const totalValid = supportCount + opposeCount;
          const consensusScore = totalValid > 0 ? Math.abs(supportCount - opposeCount) / totalValid : 0;
          const hasConsensus = consensusScore >= 0.6 && relationReviews.length >= 2;
          const needsArbitration = !hasConsensus && relationReviews.length >= 2 && (supportCount > 0 && opposeCount > 0);
          const latestReviewAt = relationReviews.reduce((latest, r) =>
            r.updatedAt > latest ? r.updatedAt : latest, relationReviews[0].updatedAt
          );
          return {
            relationId,
            fragmentPair: [relation.sourceId, relation.targetId] as [string, string],
            totalReviews: relationReviews.length,
            supportCount,
            opposeCount,
            abstainCount: abstainCount + suggestCount,
            avgConfidence: Math.round(avgConfidence),
            weightedConfidence: Math.round(weightedConfidence),
            consensusScore: Math.round(consensusScore * 100) / 100,
            hasConsensus,
            needsArbitration,
            latestReviewAt
          };
        },

        getAllReviewSummaries: () => {
          const { relations } = get();
          const summaries: ReviewSummary[] = [];
          for (const rel of relations) {
            const summary = get().calculateReviewSummary(rel.id);
            if (summary) {
              summaries.push(summary);
            }
          }
          return summaries.sort((a, b) =>
            new Date(b.latestReviewAt).getTime() - new Date(a.latestReviewAt).getTime()
          );
        },

        getPendingArbitrations: () => {
          return get().arbitrations.filter((a) => a.status === ArbitrationStatus.PENDING);
        },

        getResolvedArbitrations: () => {
          return get().arbitrations.filter((a) => a.status !== ArbitrationStatus.PENDING);
        },

        createArbitration: (relationId) => {
          const { arbitrations, relations, reviews, fragments, currentResearcherId, researchers } = get();
          const relation = relations.find((r) => r.id === relationId);
          if (!relation) {
            return { success: false, message: '关系不存在' };
          }
          const existing = arbitrations.find((a) => a.relationId === relationId && a.status === ArbitrationStatus.PENDING);
          if (existing) {
            return { success: false, message: '此关系已有待仲裁事项' };
          }
          const relationReviews = reviews.filter((r) => r.relationId === relationId);
          if (relationReviews.length < 2) {
            return { success: false, message: '至少需要2条评议才能创建仲裁' };
          }
          const supportCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.SUPPORT).length;
          const opposeCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.OPPOSE).length;
          const abstainCount = relationReviews.filter((r) => r.verdict === ReviewVerdict.ABSTAIN || r.verdict === ReviewVerdict.SUGGEST_REVIEW).length;
          const totalValid = supportCount + opposeCount;
          const consensusScore = totalValid > 0 ? Math.abs(supportCount - opposeCount) / totalValid : 0;
          const now = new Date().toISOString();
          const newArbitration: Arbitration = {
            id: `arbitration-${generateId()}`,
            relationId,
            fragmentPair: [relation.sourceId, relation.targetId] as [string, string],
            status: ArbitrationStatus.PENDING,
            reviews: JSON.parse(JSON.stringify(relationReviews)),
            consensusScore: Math.round(consensusScore * 100) / 100,
            supportCount,
            opposeCount,
            abstainCount,
            createdAt: now
          };
          set({ arbitrations: [...arbitrations, newArbitration] });
          const sourceFrag = fragments.find((f) => f.id === relation.sourceId);
          const targetFrag = fragments.find((f) => f.id === relation.targetId);
          const targets: OperationTarget[] = [
            { type: 'relation', id: relationId },
            { type: 'fragment', id: relation.sourceId, code: sourceFrag?.code, name: sourceFrag?.name },
            { type: 'fragment', id: relation.targetId, code: targetFrag?.code, name: targetFrag?.name }
          ];
          const changes: FieldChange[] = [
            { field: 'arbitration', newValue: 'created', label: '仲裁状态' },
            { field: 'consensusScore', newValue: consensusScore, label: '共识度' }
          ];
          const currentResearcher = researchers.find((r) => r.id === currentResearcherId);
          const description = `创建仲裁事项 [${sourceFrag?.code || relation.sourceId}] ↔ [${targetFrag?.code || relation.targetId}]`;
          get().recordOperation(OperationType.NOTES_UPDATE, targets, changes, description, `由 ${currentResearcher?.name || currentResearcherId} 发起`);
          return { success: true, message: '仲裁事项创建成功', arbitrationId: newArbitration.id };
        },

        resolveArbitration: (arbitrationId, outcome, notes, finalConfidence) => {
          const { arbitrations, researchers, currentResearcherId, relations, updateRelation, fragments } = get();
          const arbitration = arbitrations.find((a) => a.id === arbitrationId);
          if (!arbitration) {
            return { success: false, message: '仲裁事项不存在' };
          }
          if (arbitration.status !== ArbitrationStatus.PENDING) {
            return { success: false, message: '此仲裁事项已处理' };
          }
          const now = new Date().toISOString();
          const arbitrator = researchers.find((r) => r.id === currentResearcherId);
          const updatedArbitration: Arbitration = {
            ...arbitration,
            status: ArbitrationStatus.RESOLVED,
            arbitratedAt: now,
            arbitratorId: currentResearcherId,
            outcome,
            arbitrationNotes: notes,
            finalConfidence
          };
          set({
            arbitrations: arbitrations.map((a) => a.id === arbitrationId ? updatedArbitration : a)
          });
          if (outcome === ArbitrationOutcome.ACCEPT_RELATION && finalConfidence !== undefined) {
            updateRelation(arbitration.relationId, { confidence: finalConfidence }, `仲裁裁决：采纳关系，可信度调整为${finalConfidence}%`);
          } else if (outcome === ArbitrationOutcome.REJECT_RELATION) {
            updateRelation(arbitration.relationId, { confidence: 0 }, '仲裁裁决：否决关系');
          } else if (outcome === ArbitrationOutcome.REVISE_RELATION && finalConfidence !== undefined) {
            updateRelation(arbitration.relationId, { confidence: finalConfidence }, `仲裁裁决：修订关系，可信度调整为${finalConfidence}%`);
          }
          const sourceFrag = fragments.find((f) => f.id === arbitration.fragmentPair[0]);
          const targetFrag = fragments.find((f) => f.id === arbitration.fragmentPair[1]);
          const targets: OperationTarget[] = [
            { type: 'relation', id: arbitration.relationId },
            { type: 'fragment', id: arbitration.fragmentPair[0], code: sourceFrag?.code, name: sourceFrag?.name },
            { type: 'fragment', id: arbitration.fragmentPair[1], code: targetFrag?.code, name: targetFrag?.name }
          ];
          const changes: FieldChange[] = [
            { field: 'outcome', newValue: outcome, label: '仲裁结果' },
            { field: 'status', oldValue: ArbitrationStatus.PENDING, newValue: ArbitrationStatus.RESOLVED, label: '仲裁状态' }
          ];
          const description = `仲裁裁决 [${sourceFrag?.code || ''}] ↔ [${targetFrag?.code || ''}]：${
            outcome === ArbitrationOutcome.ACCEPT_RELATION ? '采纳关系' :
            outcome === ArbitrationOutcome.REJECT_RELATION ? '否决关系' :
            outcome === ArbitrationOutcome.REVISE_RELATION ? '修订关系' : '待进一步研究'
          }`;
          get().recordOperation(OperationType.NOTES_UPDATE, targets, changes, description, `仲裁员：${arbitrator?.name || currentResearcherId}\n${notes}`);
          return { success: true, message: '仲裁裁决已记录' };
        },

        dismissArbitration: (arbitrationId, notes) => {
          const { arbitrations, researchers, currentResearcherId, fragments } = get();
          const arbitration = arbitrations.find((a) => a.id === arbitrationId);
          if (!arbitration) {
            return { success: false, message: '仲裁事项不存在' };
          }
          const now = new Date().toISOString();
          const arbitrator = researchers.find((r) => r.id === currentResearcherId);
          const updatedArbitration: Arbitration = {
            ...arbitration,
            status: ArbitrationStatus.DISMISSED,
            arbitratedAt: now,
            arbitratorId: currentResearcherId,
            arbitrationNotes: notes
          };
          set({
            arbitrations: arbitrations.map((a) => a.id === arbitrationId ? updatedArbitration : a)
          });
          const sourceFrag = fragments.find((f) => f.id === arbitration.fragmentPair[0]);
          const targetFrag = fragments.find((f) => f.id === arbitration.fragmentPair[1]);
          const targets: OperationTarget[] = [{ type: 'relation', id: arbitration.relationId }];
          const changes: FieldChange[] = [
            { field: 'status', oldValue: ArbitrationStatus.PENDING, newValue: ArbitrationStatus.DISMISSED, label: '仲裁状态' }
          ];
          const description = `驳回仲裁 [${sourceFrag?.code || ''}] ↔ [${targetFrag?.code || ''}]`;
          get().recordOperation(OperationType.NOTES_UPDATE, targets, changes, description, `仲裁员：${arbitrator?.name || currentResearcherId}\n${notes}`);
          return { success: true, message: '仲裁已驳回' };
        },

        getArbitrationForRelation: (relationId) => {
          return get().arbitrations.find((a) => a.relationId === relationId) || null;
        },

        getReviewTimeline: () => {
          const { reviews, arbitrations, relations, researchers, history, evidenceAttachments, fragments } = get();
          const events: ReviewTimelineEvent[] = [];
          for (const review of reviews) {
            const reviewer = researchers.find((r) => r.id === review.reviewerId);
            events.push({
              id: `timeline-review-${review.id}`,
              type: 'review',
              timestamp: review.createdAt,
              relationId: review.relationId,
              fragmentPair: review.fragmentPair,
              researcherId: review.reviewerId,
              researcherName: reviewer?.name,
              description: `${reviewer?.name || review.reviewerId} 提交评议：${
                review.verdict === ReviewVerdict.SUPPORT ? '支持' :
                review.verdict === ReviewVerdict.OPPOSE ? '反对' :
                review.verdict === ReviewVerdict.ABSTAIN ? '弃权' : '建议复核'
              }（可信度：${review.confidence}%）`,
              details: {
                verdict: review.verdict,
                confidence: review.confidence,
                evidenceTypes: review.evidenceTypes
              }
            });
          }
          for (const arbitration of arbitrations) {
            const arbitrator = arbitration.arbitratorId ? researchers.find((r) => r.id === arbitration.arbitratorId) : null;
            if (arbitration.status === ArbitrationStatus.PENDING) {
              events.push({
                id: `timeline-arbitration-pending-${arbitration.id}`,
                type: 'arbitration',
                timestamp: arbitration.createdAt,
                relationId: arbitration.relationId,
                fragmentPair: arbitration.fragmentPair,
                description: `创建仲裁事项（共识度：${Math.round(arbitration.consensusScore * 100)}%）`,
                details: {
                  status: arbitration.status,
                  supportCount: arbitration.supportCount,
                  opposeCount: arbitration.opposeCount
                }
              });
            } else if (arbitration.arbitratedAt) {
              events.push({
                id: `timeline-arbitration-resolved-${arbitration.id}`,
                type: 'arbitration',
                timestamp: arbitration.arbitratedAt,
                relationId: arbitration.relationId,
                fragmentPair: arbitration.fragmentPair,
                researcherId: arbitration.arbitratorId,
                researcherName: arbitrator?.name,
                description: `${arbitrator?.name || arbitration.arbitratorId} 作出仲裁：${
                  arbitration.outcome === ArbitrationOutcome.ACCEPT_RELATION ? '采纳关系' :
                  arbitration.outcome === ArbitrationOutcome.REJECT_RELATION ? '否决关系' :
                  arbitration.outcome === ArbitrationOutcome.REVISE_RELATION ? '修订关系' :
                  arbitration.outcome === ArbitrationOutcome.FURTHER_RESEARCH ? '待进一步研究' : '已驳回'
                }`,
                details: {
                  status: arbitration.status,
                  outcome: arbitration.outcome,
                  finalConfidence: arbitration.finalConfidence
                }
              });
            }
          }
          for (const record of history) {
            if (record.type === OperationType.RELATION_ADD || record.type === OperationType.RELATION_UPDATE || record.type === OperationType.RELATION_DELETE) {
              const relationTarget = record.targets.find((t) => t.type === 'relation');
              const fragTargets = record.targets.filter((t) => t.type === 'fragment');
              if (relationTarget && relationTarget.id && fragTargets.length >= 2) {
                events.push({
                  id: `timeline-relation-${record.id}`,
                  type: 'relation_change',
                  timestamp: record.timestamp,
                  relationId: relationTarget.id,
                  fragmentPair: [fragTargets[0].id!, fragTargets[1].id!] as [string, string],
                  researcherName: record.operator,
                  description: record.description,
                  details: {
                    operationType: record.type,
                    changes: record.changes
                  }
                });
              }
            }
          }
          for (const evidence of evidenceAttachments) {
            if (evidence.targetType === AttachmentTargetType.RELATION) {
              const rel = relations.find((r) => r.id === evidence.targetId);
              if (rel) {
                events.push({
                  id: `timeline-evidence-${evidence.id}`,
                  type: 'evidence',
                  timestamp: evidence.createdAt,
                  relationId: rel.id,
                  fragmentPair: [rel.sourceId, rel.targetId] as [string, string],
                  researcherId: evidence.uploadedByResearcherId,
                  researcherName: evidence.uploadedBy,
                  description: `${evidence.uploadedBy} 上传证据：${evidence.title}`,
                  details: {
                    evidenceTitle: evidence.title,
                    evidenceType: evidence.type,
                    markerCount: evidence.markers.length
                  }
                });
              }
            }
          }
          for (const record of history) {
            if (record.type === OperationType.EVIDENCE_MARKER_ADD || record.type === OperationType.EVIDENCE_COMPARE) {
              const relationTarget = record.targets.find((t) => t.type === 'relation');
              const fragTargets = record.targets.filter((t) => t.type === 'fragment');
              let relationId = relationTarget?.id || '';
              let fragPair: [string, string] = ['', ''];
              if (fragTargets.length >= 2) {
                fragPair = [fragTargets[0].id!, fragTargets[1].id!] as [string, string];
              } else if (relationTarget) {
                const rel = relations.find((r) => r.id === relationTarget.id);
                if (rel) {
                  fragPair = [rel.sourceId, rel.targetId];
                }
              }
              if (relationId) {
                events.push({
                  id: `timeline-evidence-op-${record.id}`,
                  type: 'evidence',
                  timestamp: record.timestamp,
                  relationId,
                  fragmentPair: fragPair,
                  researcherName: record.operator,
                  description: record.description,
                  details: {
                    operationType: record.type,
                    changes: record.changes
                  }
                });
              }
            }
          }
          return events.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        },

        getReviewTimelineForRelation: (relationId) => {
          return get().getReviewTimeline().filter((e) => e.relationId === relationId);
        },

        addEvidenceAttachment: (data, note) => {
          const { evidenceAttachments, researchers, currentResearcherId, recordOperation, relations, fragments } = get();
          const researcher = researchers.find((r) => r.id === currentResearcherId);

          const now = new Date().toISOString();
          const newAttachment: EvidenceAttachment = {
            ...data,
            id: `evid-${generateId()}`,
            markers: [],
            uploadedBy: researcher?.name || '研究人员',
            uploadedByResearcherId: currentResearcherId,
            createdAt: now,
            updatedAt: now
          };

          let targetDescription = '';
          const targets: OperationTarget[] = [];
          if (data.targetType === AttachmentTargetType.RELATION) {
            const rel = relations.find((r) => r.id === data.targetId);
            if (rel) {
              const sf = fragments.find((f) => f.id === rel.sourceId);
              const tf = fragments.find((f) => f.id === rel.targetId);
              targetDescription = `缀合关系 [${sf?.code || ''} ↔ ${tf?.code || ''}]`;
              targets.push({ type: 'relation', id: rel.id });
            }
          } else if (data.targetType === AttachmentTargetType.FRAGMENT) {
            const frag = fragments.find((f) => f.id === data.targetId);
            if (frag) {
              targetDescription = `残片 [${frag.code}]`;
              targets.push({ type: 'fragment', id: frag.id, code: frag.code, name: frag.name });
            }
          } else {
            targetDescription = `评议 ${data.targetId}`;
            targets.push({ type: 'relation', id: data.targetId });
          }

          const changes: FieldChange[] = [
            { field: 'type', newValue: data.type, label: '证据类型' },
            { field: 'title', newValue: data.title, label: '附件标题' },
            { field: 'fileName', newValue: data.fileName, label: '文件名' }
          ];
          const description = `为${targetDescription}上传证据附件：${data.title}`;

          set({ evidenceAttachments: [...evidenceAttachments, newAttachment] });
          recordOperation(OperationType.EVIDENCE_ADD, targets, changes, description, note);
          return { success: true, message: '证据附件上传成功', attachmentId: newAttachment.id };
        },

        updateEvidenceAttachment: (id, data, note) => {
          const { evidenceAttachments, recordOperation } = get();
          const existing = evidenceAttachments.find((e) => e.id === id);
          if (!existing) {
            return { success: false, message: '证据附件不存在' };
          }
          const updated: EvidenceAttachment = { ...existing, ...data, updatedAt: new Date().toISOString() };
          const changes: FieldChange[] = [];
          if (data.title !== undefined && data.title !== existing.title) {
            changes.push({ field: 'title', oldValue: existing.title, newValue: data.title, label: '附件标题' });
          }
          if (data.description !== undefined && data.description !== existing.description) {
            changes.push({ field: 'description', oldValue: existing.description, newValue: data.description, label: '描述' });
          }
          if (data.type !== undefined && data.type !== existing.type) {
            changes.push({ field: 'type', oldValue: existing.type, newValue: data.type, label: '证据类型' });
          }
          if (changes.length === 0) {
            return { success: true, message: '无变更内容' };
          }

          const targets: OperationTarget[] = [{ type: existing.targetType, id: existing.targetId }];
          const description = `更新证据附件 [${existing.title}]：${changes.map((c) => c.label).join(', ')}`;

          set({
            evidenceAttachments: evidenceAttachments.map((e) => (e.id === id ? updated : e))
          });
          recordOperation(OperationType.EVIDENCE_UPDATE, targets, changes, description, note);
          return { success: true, message: '证据附件更新成功' };
        },

        deleteEvidenceAttachment: (id, note) => {
          const { evidenceAttachments, recordOperation } = get();
          const existing = evidenceAttachments.find((e) => e.id === id);
          if (!existing) {
            return { success: false, message: '证据附件不存在' };
          }

          const targets: OperationTarget[] = [{ type: existing.targetType, id: existing.targetId }];
          const changes: FieldChange[] = [
            { field: 'title', oldValue: existing.title, label: '附件标题' },
            { field: 'fileName', oldValue: existing.fileName, label: '文件名' }
          ];
          const description = `删除证据附件：${existing.title}`;

          set({ evidenceAttachments: evidenceAttachments.filter((e) => e.id !== id) });
          recordOperation(OperationType.EVIDENCE_DELETE, targets, changes, description, note);
          return { success: true, message: '证据附件已删除' };
        },

        getEvidenceForTarget: (targetType, targetId) => {
          return get().evidenceAttachments.filter((e) => e.targetType === targetType && e.targetId === targetId);
        },

        getEvidenceForRelation: (relationId) => {
          return get().evidenceAttachments.filter((e) =>
            (e.targetType === AttachmentTargetType.RELATION && e.targetId === relationId) ||
            (e.fragmentReferenceIds && e.fragmentReferenceIds.length > 0)
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        getEvidenceForFragment: (fragmentId) => {
          return get().evidenceAttachments.filter((e) =>
            (e.targetType === AttachmentTargetType.FRAGMENT && e.targetId === fragmentId) ||
            (e.fragmentReferenceIds && e.fragmentReferenceIds.includes(fragmentId))
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        getEvidenceForReview: (reviewId) => {
          return get().evidenceAttachments.filter((e) => e.targetType === AttachmentTargetType.REVIEW && e.targetId === reviewId);
        },

        getAllEvidence: () => {
          return [...get().evidenceAttachments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        setEvidenceFilter: (filter) => {
          set({ evidenceFilter: { ...get().evidenceFilter, ...filter } });
        },

        clearEvidenceFilter: () => {
          set({ evidenceFilter: {} });
        },

        getFilteredEvidence: () => {
          const { evidenceAttachments, evidenceFilter } = get();
          return evidenceAttachments.filter((e) => {
            if (evidenceFilter.targetType && e.targetType !== evidenceFilter.targetType) return false;
            if (evidenceFilter.targetId && e.targetId !== evidenceFilter.targetId) return false;
            if (evidenceFilter.attachmentTypes && evidenceFilter.attachmentTypes.length > 0) {
              if (!evidenceFilter.attachmentTypes.includes(e.type)) return false;
            }
            if (evidenceFilter.uploadedBy && !e.uploadedBy.includes(evidenceFilter.uploadedBy)) return false;
            if (evidenceFilter.dateFrom && e.createdAt < evidenceFilter.dateFrom) return false;
            if (evidenceFilter.dateTo && e.createdAt > evidenceFilter.dateTo) return false;
            return true;
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        addMarkerToAttachment: (attachmentId, marker, note) => {
          const { evidenceAttachments, recordOperation } = get();
          const existing = evidenceAttachments.find((e) => e.id === attachmentId);
          if (!existing) {
            return { success: false, message: '证据附件不存在' };
          }
          const newMarker: AnnotationMarker = { ...marker, id: `mk-${generateId()}` };
          const updated: EvidenceAttachment = {
            ...existing,
            markers: [...existing.markers, newMarker],
            updatedAt: new Date().toISOString()
          };

          const targets: OperationTarget[] = [{ type: existing.targetType, id: existing.targetId }];
          const changes: FieldChange[] = [
            { field: 'marker', newValue: newMarker.label, label: '标注区域' }
          ];
          const description = `在证据附件 [${existing.title}] 上添加标注：${newMarker.label}`;

          set({
            evidenceAttachments: evidenceAttachments.map((e) => (e.id === attachmentId ? updated : e))
          });
          recordOperation(OperationType.EVIDENCE_MARKER_ADD, targets, changes, description, note);
          return { success: true, message: '标注添加成功', markerId: newMarker.id };
        },

        updateMarker: (attachmentId, markerId, data) => {
          const { evidenceAttachments } = get();
          const existing = evidenceAttachments.find((e) => e.id === attachmentId);
          if (!existing) {
            return { success: false, message: '证据附件不存在' };
          }
          const updatedMarkers = existing.markers.map((m) =>
            m.id === markerId ? { ...m, ...data } : m
          );
          const updated: EvidenceAttachment = {
            ...existing,
            markers: updatedMarkers,
            updatedAt: new Date().toISOString()
          };
          set({
            evidenceAttachments: evidenceAttachments.map((e) => (e.id === attachmentId ? updated : e))
          });
          return { success: true, message: '标注更新成功' };
        },

        deleteMarker: (attachmentId, markerId) => {
          const { evidenceAttachments } = get();
          const existing = evidenceAttachments.find((e) => e.id === attachmentId);
          if (!existing) {
            return { success: false, message: '证据附件不存在' };
          }
          const updated: EvidenceAttachment = {
            ...existing,
            markers: existing.markers.filter((m) => m.id !== markerId),
            updatedAt: new Date().toISOString()
          };
          set({
            evidenceAttachments: evidenceAttachments.map((e) => (e.id === attachmentId ? updated : e))
          });
          return { success: true, message: '标注已删除' };
        },

        createCompareSession: (data, note) => {
          const { compareSessions, evidenceAttachments, researchers, currentResearcherId, recordOperation } = get();
          const researcher = researchers.find((r) => r.id === currentResearcherId);
          const leftEvid = evidenceAttachments.find((e) => e.id === data.leftAttachmentId);
          const rightEvid = evidenceAttachments.find((e) => e.id === data.rightAttachmentId);

          const now = new Date().toISOString();
          const newSession: CompareSession = {
            ...data,
            id: `sess-${generateId()}`,
            markers: [],
            createdBy: researcher?.name || '研究人员',
            createdAt: now
          };

          const targets: OperationTarget[] = [];
          if (leftEvid) targets.push({ type: leftEvid.targetType, id: leftEvid.targetId });
          if (rightEvid && rightEvid.targetId !== leftEvid?.targetId) {
            targets.push({ type: rightEvid.targetType, id: rightEvid.targetId });
          }
          const changes: FieldChange[] = [
            { field: 'leftAttachment', newValue: leftEvid?.title || data.leftAttachmentId, label: '左图' },
            { field: 'rightAttachment', newValue: rightEvid?.title || data.rightAttachmentId, label: '右图' }
          ];
          const description = `创建比对会话：${data.title}`;

          set({ compareSessions: [...compareSessions, newSession] });
          recordOperation(OperationType.EVIDENCE_COMPARE, targets, changes, description, note);
          return { success: true, message: '比对会话创建成功', sessionId: newSession.id };
        },

        deleteCompareSession: (sessionId) => {
          const { compareSessions } = get();
          set({ compareSessions: compareSessions.filter((s) => s.id !== sessionId) });
          return { success: true, message: '比对会话已删除' };
        },

        getCompareSessionsForTarget: (targetId) => {
          const { compareSessions, evidenceAttachments } = get();
          if (!targetId) {
            return [...compareSessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
          return compareSessions.filter((s) => {
            const left = evidenceAttachments.find((e) => e.id === s.leftAttachmentId);
            const right = evidenceAttachments.find((e) => e.id === s.rightAttachmentId);
            return left?.targetId === targetId || right?.targetId === targetId;
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        addMarkerToCompareSession: (sessionId, marker) => {
          const { compareSessions } = get();
          const existing = compareSessions.find((s) => s.id === sessionId);
          if (!existing) {
            return { success: false, message: '比对会话不存在' };
          }
          const newMarker: AnnotationMarker = { ...marker, id: `sess-mk-${generateId()}` };
          set({
            compareSessions: compareSessions.map((s) =>
              s.id === sessionId ? { ...s, markers: [...s.markers, newMarker] } : s
            )
          });
          return { success: true, message: '标注添加成功', markerId: newMarker.id };
        },

        updateCompareSessionMarker: (sessionId, markerId, data) => {
          const { compareSessions } = get();
          set({
            compareSessions: compareSessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    markers: s.markers.map((m) => (m.id === markerId ? { ...m, ...data } : m))
                  }
                : s
            )
          });
          return { success: true, message: '标注更新成功' };
        },

        deleteCompareSessionMarker: (sessionId, markerId) => {
          const { compareSessions } = get();
          set({
            compareSessions: compareSessions.map((s) =>
              s.id === sessionId
                ? { ...s, markers: s.markers.filter((m) => m.id !== markerId) }
                : s
            )
          });
          return { success: true, message: '标注已删除' };
        },

        toggleCompareSync: (sessionId, syncType) => {
          const { compareSessions } = get();
          set({
            compareSessions: compareSessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    syncZoom: syncType === 'zoom' ? !s.syncZoom : s.syncZoom,
                    syncPan: syncType === 'pan' ? !s.syncPan : s.syncPan
                  }
                : s
            )
          });
        },

        updateCompareSessionNotes: (sessionId, notes) => {
          const { compareSessions } = get();
          set({
            compareSessions: compareSessions.map((s) =>
              s.id === sessionId ? { ...s, notes } : s
            )
          });
        }
      };
    },
    {
      name: 'oracle-bone-fragments-storage',
      partialize: (state) => ({
        fragments: state.fragments,
        relations: state.relations,
        nodePositions: state.nodePositions,
        history: state.history,
        snapshots: state.snapshots,
        currentVersion: state.currentVersion,
        reviews: state.reviews,
        arbitrations: state.arbitrations,
        researchers: state.researchers,
        currentResearcherId: state.currentResearcherId,
        evidenceAttachments: state.evidenceAttachments,
        compareSessions: state.compareSessions,
        evidenceFilter: state.evidenceFilter
      })
    }
  )
);
