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
  const pairRelations = new Map<string, Relation[]>();

  relations.forEach((r) => {
    const pairKey = [r.sourceId, r.targetId].sort().join('-');
    if (!pairRelations.has(pairKey)) {
      pairRelations.set(pairKey, []);
    }
    pairRelations.get(pairKey)!.push(r);
  });

  const conflictingGroups: Relation[][] = [];

  pairRelations.forEach((group) => {
    if (group.length >= 2) {
      const types = new Set(group.map((r) => r.type));
      if (types.size >= 2 || group.length >= 2) {
        conflictingGroups.push(group);
      }
    }
  });

  return conflictingGroups;
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
