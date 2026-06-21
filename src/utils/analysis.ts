import { Fragment, Relation, AnalysisResult } from '@/types';

const HIGH_CONFIDENCE_THRESHOLD = 80;

export function getIsolatedFragments(
  fragments: Fragment[],
  relations: Relation[]
): Fragment[] {
  const fragmentIdsWithRelations = new Set<string>();

  relations.forEach((r) => {
    fragmentIdsWithRelations.add(r.sourceId);
    fragmentIdsWithRelations.add(r.targetId);
  });

  return fragments.filter((f) => !fragmentIdsWithRelations.has(f.id));
}

export function getConflictingRelationGroups(
  relations: Relation[]
): Relation[][] {
  const pairTypeRelations = new Map<string, Relation[]>();

  relations.forEach((r) => {
    const pairKey = [r.sourceId, r.targetId].sort().join('-');
    const key = `${pairKey}-${r.type}`;
    if (!pairTypeRelations.has(key)) {
      pairTypeRelations.set(key, []);
    }
    pairTypeRelations.get(key)!.push(r);
  });

  const conflictingGroups: Relation[][] = [];

  pairTypeRelations.forEach((group) => {
    if (group.length >= 2) {
      conflictingGroups.push(group);
    }
  });

  return conflictingGroups;
}

export interface HighConfidenceGroup {
  id: string;
  fragmentIds: string[];
  relations: Relation[];
  avgConfidence: number;
  minConfidence: number;
}

export function getHighConfidenceGroups(
  fragments: Fragment[],
  relations: Relation[]
): HighConfidenceGroup[] {
  const highConfidenceRelations = relations.filter(
    (r) => r.confidence >= HIGH_CONFIDENCE_THRESHOLD
  );

  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x);
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  }

  fragments.forEach((f) => find(f.id));

  highConfidenceRelations.forEach((r) => {
    union(r.sourceId, r.targetId);
  });

  const groupsMap = new Map<string, { fragmentIds: Set<string>; relations: Relation[] }>();

  fragments.forEach((f) => {
    const root = find(f.id);
    if (!groupsMap.has(root)) {
      groupsMap.set(root, { fragmentIds: new Set(), relations: [] });
    }
  });

  highConfidenceRelations.forEach((r) => {
    const root = find(r.sourceId);
    const group = groupsMap.get(root)!;
    group.fragmentIds.add(r.sourceId);
    group.fragmentIds.add(r.targetId);
    group.relations.push(r);
  });

  const result: HighConfidenceGroup[] = [];

  groupsMap.forEach((group, root) => {
    if (group.fragmentIds.size >= 2) {
      const confidences = group.relations.map((r) => r.confidence);
      result.push({
        id: root,
        fragmentIds: Array.from(group.fragmentIds),
        relations: [...group.relations].sort((a, b) => b.confidence - a.confidence),
        avgConfidence: Math.round(
          confidences.reduce((a, b) => a + b, 0) / confidences.length
        ),
        minConfidence: Math.min(...confidences)
      });
    }
  });

  return result.sort((a, b) => b.fragmentIds.length - a.fragmentIds.length || b.avgConfidence - a.avgConfidence);
}

export function getHighConfidenceRelations(
  relations: Relation[]
): Relation[] {
  return relations
    .filter((r) => r.confidence >= HIGH_CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getGroupedFragments(fragments: Fragment[]): Fragment[] {
  return fragments.filter((f) => f.isGrouped);
}

export function analyzeNetwork(
  fragments: Fragment[],
  relations: Relation[]
): AnalysisResult {
  return {
    totalFragments: fragments.length,
    totalRelations: relations.length,
    isolatedFragments: getIsolatedFragments(fragments, relations),
    conflictingRelationGroups: getConflictingRelationGroups(relations),
    highConfidenceRelations: getHighConfidenceRelations(relations),
    highConfidenceGroups: getHighConfidenceGroups(fragments, relations),
    groupedFragments: getGroupedFragments(fragments)
  };
}

export function getFragmentRelations(
  fragmentId: string,
  relations: Relation[]
): Relation[] {
  return relations.filter(
    (r) => r.sourceId === fragmentId || r.targetId === fragmentId
  );
}

export function getRelatedFragments(
  fragmentId: string,
  fragments: Fragment[],
  relations: Relation[]
): Fragment[] {
  const relatedIds = new Set<string>();

  relations.forEach((r) => {
    if (r.sourceId === fragmentId) {
      relatedIds.add(r.targetId);
    } else if (r.targetId === fragmentId) {
      relatedIds.add(r.sourceId);
    }
  });

  return fragments.filter((f) => relatedIds.has(f.id));
}
