import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Fragment, Relation, RelationType, NodePositionsMap, GroupingValidationResult } from '@/types';
import { validateFragmentCode, validateAddRelation, validateGrouping, validateGroupingDetailed } from '@/utils/validation';
import { analyzeNetwork, getConflictingRelationGroups } from '@/utils/analysis';
import { mockFragments, mockRelations } from '@/data/mockData';

interface AppState {
  fragments: Fragment[];
  relations: Relation[];
  nodePositions: NodePositionsMap;
  selectedFragmentId: string | null;
  selectedRelationId: string | null;
  searchKeyword: string;
  filterType: RelationType | 'all';
  filterConfidenceMin: number;

  addFragment: (data: Omit<Fragment, 'id' | 'createdAt' | 'updatedAt' | 'isGrouped'>) => { success: boolean; message: string };
  updateFragment: (id: string, data: Partial<Fragment>) => { success: boolean; message: string };
  deleteFragment: (id: string) => void;
  selectFragment: (id: string | null) => void;

  addRelation: (data: Omit<Relation, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; message: string };
  updateRelation: (id: string, data: Partial<Relation>) => { success: boolean; message: string };
  deleteRelation: (id: string) => void;
  selectRelation: (id: string | null) => void;

  setNodePosition: (id: string, position: { x: number; y: number }) => void;
  setNodePositions: (positions: NodePositionsMap) => void;
  clearNodePositions: () => void;
  resetNodePositionsToDefault: () => void;

  setSearchKeyword: (keyword: string) => void;
  setFilterType: (type: RelationType | 'all') => void;
  setFilterConfidenceMin: (value: number) => void;

  toggleGrouped: (fragmentId: string) => { success: boolean; message: string };
  validateGroupingForFragment: (fragmentId: string) => GroupingValidationResult;

  getAnalysis: () => ReturnType<typeof analyzeNetwork>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      fragments: mockFragments,
      relations: mockRelations,
      nodePositions: {},
      selectedFragmentId: null,
      selectedRelationId: null,
      searchKeyword: '',
      filterType: 'all',
      filterConfidenceMin: 0,

      addFragment: (data) => {
        const { fragments } = get();
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

        set({ fragments: [...fragments, newFragment] });
        return { success: true, message: '残片添加成功' };
      },

      updateFragment: (id, data) => {
        const { fragments } = get();
        
        if (data.code !== undefined) {
          const validation = validateFragmentCode(data.code, fragments, id);
          if (!validation.valid) {
            return { success: false, message: validation.message };
          }
        }

        const updatedFragments = fragments.map((f) =>
          f.id === id
            ? { ...f, ...data, updatedAt: new Date().toISOString() }
            : f
        );

        set({ fragments: updatedFragments });
        return { success: true, message: '残片更新成功' };
      },

      deleteFragment: (id) => {
        const { fragments, relations, selectedFragmentId, nodePositions } = get();
        
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
      },

      selectFragment: (id) => {
        set({ selectedFragmentId: id, selectedRelationId: null });
      },

      addRelation: (data) => {
        const { relations } = get();
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

        set({ relations: [...relations, newRelation] });
        return { success: true, message: '缀合关系添加成功' };
      },

      updateRelation: (id, data) => {
        const { relations } = get();
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

        const updatedRelations = relations.map((r) =>
          r.id === id
            ? { ...r, ...data, updatedAt: new Date().toISOString() }
            : r
        );

        set({ relations: updatedRelations });
        return { success: true, message: '缀合关系更新成功' };
      },

      deleteRelation: (id) => {
        const { relations, selectedRelationId } = get();
        set({
          relations: relations.filter((r) => r.id !== id),
          selectedRelationId: selectedRelationId === id ? null : selectedRelationId
        });
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

      toggleGrouped: (fragmentId) => {
        const { fragments } = get();
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

        const updatedFragments = fragments.map((f) =>
          f.id === fragmentId
            ? { ...f, isGrouped: !f.isGrouped, updatedAt: new Date().toISOString() }
            : f
        );

        set({ fragments: updatedFragments });
        return {
          success: true,
          message: fragment.isGrouped ? '已取消定组' : '已标记为已定组'
        };
      },

      validateGroupingForFragment: (fragmentId) => {
        const { fragments, relations } = get();
        return validateGroupingDetailed(fragmentId, fragments, relations);
      },

      getAnalysis: () => {
        const { fragments, relations } = get();
        return analyzeNetwork(fragments, relations);
      }
    }),
    {
      name: 'oracle-bone-fragments-storage',
      partialize: (state) => ({
        fragments: state.fragments,
        relations: state.relations,
        nodePositions: state.nodePositions
      })
    }
  )
);
