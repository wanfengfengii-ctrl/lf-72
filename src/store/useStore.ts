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
  HistoryFilter
} from '@/types';
import { validateFragmentCode, validateAddRelation, validateGrouping, validateGroupingDetailed } from '@/utils/validation';
import { analyzeNetwork } from '@/utils/analysis';
import { mockFragments, mockRelations } from '@/data/mockData';

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
        currentVersion: state.currentVersion
      })
    }
  )
);
