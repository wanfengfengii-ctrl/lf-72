import { Fragment, Relation, AnalysisResult, ConflictGroupType, ConflictRelationGroup } from '@/types';

const HIGH_CONFIDENCE_THRESHOLD = 80;
const MIN_GROUPING_CONFIDENCE = 60;

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

function getPairKey(sourceId: string, targetId: string): string {
  return [sourceId, targetId].sort().join('-');
}

function parsePairKey(pairKey: string): [string, string] {
  const parts = pairKey.split('-');
  return [parts[0], parts[1]];
}

export function getConflictRelationGroups(
  relations: Relation[]
): {
  multiEvidenceGroups: ConflictRelationGroup[];
  trueConflictGroups: ConflictRelationGroup[];
} {
  const pairRelations = new Map<string, Relation[]>();

  relations.forEach((r) => {
    const pairKey = getPairKey(r.sourceId, r.targetId);
    if (!pairRelations.has(pairKey)) {
      pairRelations.set(pairKey, []);
    }
    pairRelations.get(pairKey)!.push(r);
  });

  const multiEvidenceGroups: ConflictRelationGroup[] = [];
  const trueConflictGroups: ConflictRelationGroup[] = [];

  pairRelations.forEach((pairRels, pairKey) => {
    if (pairRels.length < 2) return;

    const typeMap = new Map<string, Relation[]>();
    pairRels.forEach((r) => {
      if (!typeMap.has(r.type)) {
        typeMap.set(r.type, []);
      }
      typeMap.get(r.type)!.push(r);
    });

    const fragmentPair = parsePairKey(pairKey);

    typeMap.forEach((typeRels, type) => {
      if (typeRels.length >= 2) {
        const avgConfidence = Math.round(
          typeRels.reduce((sum, r) => sum + r.confidence, 0) / typeRels.length
        );
        multiEvidenceGroups.push({
          id: `multi-${pairKey}-${type}`,
          type: ConflictGroupType.MULTI_EVIDENCE,
          fragmentPair,
          relations: typeRels.sort((a, b) => b.confidence - a.confidence),
          avgConfidence
        });
      }
    });

    const distinctTypes = Array.from(typeMap.keys());
    const hasOpposingEvidence = distinctTypes.length >= 2;

    if (hasOpposingEvidence) {
      const confidences = pairRels.map((r) => r.confidence);
      const maxConfidence = Math.max(...confidences);
      const minConfidence = Math.min(...confidences);
      const confidenceSpread = maxConfidence - minConfidence;

      const hasMultipleHighConfidenceDifferentTypes =
        distinctTypes.filter((t) =>
          typeMap.get(t)!.some((r) => r.confidence >= HIGH_CONFIDENCE_THRESHOLD)
        ).length >= 2;

      const isTrueConflict =
        confidenceSpread >= 40 || hasMultipleHighConfidenceDifferentTypes;

      if (isTrueConflict) {
        const avgConfidence = Math.round(
          pairRels.reduce((sum, r) => sum + r.confidence, 0) / pairRels.length
        );
        trueConflictGroups.push({
          id: `conflict-${pairKey}`,
          type: ConflictGroupType.TRUE_CONFLICT,
          fragmentPair,
          relations: pairRels.sort((a, b) => b.confidence - a.confidence),
          avgConfidence
        });
      }
    }
  });

  multiEvidenceGroups.sort((a, b) => b.avgConfidence - a.avgConfidence);
  trueConflictGroups.sort((a, b) => b.relations.length - a.relations.length);

  return { multiEvidenceGroups, trueConflictGroups };
}

export function getConflictingRelationGroups(
  relations: Relation[]
): Relation[][] {
  const { trueConflictGroups } = getConflictRelationGroups(relations);
  return trueConflictGroups.map((g) => g.relations);
}

export function getMultiEvidenceRelationGroups(
  relations: Relation[]
): Relation[][] {
  const { multiEvidenceGroups } = getConflictRelationGroups(relations);
  return multiEvidenceGroups.map((g) => g.relations);
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
  const { multiEvidenceGroups, trueConflictGroups } = getConflictRelationGroups(relations);

  return {
    totalFragments: fragments.length,
    totalRelations: relations.length,
    isolatedFragments: getIsolatedFragments(fragments, relations),
    conflictingRelationGroups: trueConflictGroups,
    multiEvidenceGroups,
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

export { HIGH_CONFIDENCE_THRESHOLD, MIN_GROUPING_CONFIDENCE };
