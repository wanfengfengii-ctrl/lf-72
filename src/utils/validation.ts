import {
  Fragment,
  Relation,
  RelationType,
  ValidationResult,
  GroupingValidationResult,
  GroupingValidationDetail,
  ConflictRelationGroup
} from '@/types';
import { getConflictRelationGroups, getFragmentRelations, HIGH_CONFIDENCE_THRESHOLD, MIN_GROUPING_CONFIDENCE } from './analysis';

export function validateFragmentCode(
  code: string,
  fragments: Fragment[],
  excludeId?: string
): ValidationResult {
  if (!code || code.trim().length === 0) {
    return { valid: false, message: '残片编号不能为空' };
  }

  const trimmedCode = code.trim();
  const exists = fragments.some(
    (f) => f.code === trimmedCode && f.id !== excludeId
  );

  if (exists) {
    return { valid: false, message: `残片编号 "${trimmedCode}" 已存在，不能重复` };
  }

  return { valid: true, message: '' };
}

export function validateSelfRelation(
  sourceId: string,
  targetId: string
): ValidationResult {
  if (sourceId === targetId) {
    return { valid: false, message: '残片不能与自身建立缀合关系' };
  }
  return { valid: true, message: '' };
}

export function validateDuplicateRelation(
  sourceId: string,
  targetId: string,
  type: RelationType,
  confidence: number,
  notes: string,
  relations: Relation[],
  excludeId?: string
): ValidationResult {
  const exactDuplicate = relations.some((r) => {
    if (r.id === excludeId) return false;
    const samePair =
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId);
    return samePair && r.type === type && r.confidence === confidence && r.notes.trim() === notes.trim();
  });

  if (exactDuplicate) {
    return {
      valid: false,
      message: '已存在完全相同的缀合关系（相同残片、类型、可信度与备注），无需重复添加。'
    };
  }

  const hasSameType = relations.some((r) => {
    if (r.id === excludeId) return false;
    const samePair =
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId);
    return samePair && r.type === type;
  });

  if (hasSameType) {
    return {
      valid: true,
      message: ''
    };
  }

  return { valid: true, message: '' };
}

export function validateConfidence(confidence: number): ValidationResult {
  if (isNaN(confidence)) {
    return { valid: false, message: '可信度必须是数字' };
  }
  if (confidence < 0 || confidence > 100) {
    return { valid: false, message: '可信度范围必须在 0-100 之间' };
  }
  return { valid: true, message: '' };
}

export function validateGrouping(
  fragmentId: string,
  relations: Relation[],
  conflictingGroups: Relation[][]
): ValidationResult {
  const hasConflict = conflictingGroups.some((group) =>
    group.some(
      (r) => r.sourceId === fragmentId || r.targetId === fragmentId
    )
  );

  if (hasConflict) {
    return {
      valid: false,
      message: '存在冲突关系的残片不能标记为已定组'
    };
  }

  return { valid: true, message: '' };
}

export function validateGroupingDetailed(
  fragmentId: string,
  fragments: Fragment[],
  relations: Relation[]
): GroupingValidationResult {
  const warnings: string[] = [];
  const conflictDetails: string[] = [];

  const fragmentRelations = getFragmentRelations(fragmentId, relations);
  const hasRelations = fragmentRelations.length > 0;
  const relationCount = fragmentRelations.length;

  const { trueConflictGroups } = getConflictRelationGroups(relations);
  const involvedConflicts = trueConflictGroups.filter(
    (g) =>
      g.fragmentPair.includes(fragmentId) ||
      g.relations.some(
        (r) => r.sourceId === fragmentId || r.targetId === fragmentId
      )
  );
  const hasConflicts = involvedConflicts.length > 0;

  if (hasConflicts) {
    involvedConflicts.forEach((group) => {
      const [a, b] = group.fragmentPair;
      const fragA = fragments.find((f) => f.id === a)?.code || a;
      const fragB = fragments.find((f) => f.id === b)?.code || b;
      conflictDetails.push(
        `${fragA} 与 ${fragB} 之间存在 ${group.relations.length} 条不同结论的缀合关系（可信度跨度较大）`
      );
    });
  }

  const highConfidenceRelations = fragmentRelations.filter(
    (r) => r.confidence >= HIGH_CONFIDENCE_THRESHOLD
  );
  const hasHighConfidenceRelations = highConfidenceRelations.length > 0;
  const highConfidenceCount = highConfidenceRelations.length;

  const relatedFragmentIds = new Set<string>();
  fragmentRelations.forEach((r) => {
    if (r.sourceId === fragmentId) relatedFragmentIds.add(r.targetId);
    if (r.targetId === fragmentId) relatedFragmentIds.add(r.sourceId);
  });

  const connectedGroupedIds: string[] = [];
  relatedFragmentIds.forEach((rid) => {
    const frag = fragments.find((f) => f.id === rid);
    if (frag?.isGrouped) {
      connectedGroupedIds.push(rid);
    }
  });
  const connectedToGrouped = connectedGroupedIds.length > 0;

  const minConfidenceValue = fragmentRelations.length > 0
    ? Math.min(...fragmentRelations.map((r) => r.confidence))
    : 0;
  const minConfidenceOk = fragmentRelations.length > 0 && minConfidenceValue >= MIN_GROUPING_CONFIDENCE;

  if (!hasRelations) {
    return {
      valid: false,
      message: '该残片尚未建立任何缀合关系，无法定组。请先添加至少一条缀合关系。',
      details: {
        hasRelations,
        relationCount,
        hasConflicts,
        conflictDetails,
        hasHighConfidenceRelations,
        highConfidenceCount,
        connectedToGrouped,
        connectedGroupedIds,
        minConfidenceOk,
        minConfidenceValue
      },
      warnings: []
    };
  }

  if (hasConflicts) {
    return {
      valid: false,
      message: `该残片涉及 ${involvedConflicts.length} 组冲突关系，请先解决冲突后再定组。`,
      details: {
        hasRelations,
        relationCount,
        hasConflicts,
        conflictDetails,
        hasHighConfidenceRelations,
        highConfidenceCount,
        connectedToGrouped,
        connectedGroupedIds,
        minConfidenceOk,
        minConfidenceValue
      },
      warnings: []
    };
  }

  if (!hasHighConfidenceRelations) {
    warnings.push(
      `该残片暂无可信度 ≥${HIGH_CONFIDENCE_THRESHOLD}% 的高可信缀合关系，建议先补充高可信证据。`
    );
  }

  if (!minConfidenceOk) {
    warnings.push(
      `该残片的缀合关系最低可信度为 ${minConfidenceValue}%，低于建议阈值 ${MIN_GROUPING_CONFIDENCE}%，建议复核。`
    );
  }

  if (connectedToGrouped) {
    const connectedCodes = connectedGroupedIds
      .map((id) => fragments.find((f) => f.id === id)?.code || id)
      .join('、');
    warnings.push(
      `该残片已与已定组残片（${connectedCodes}）相连，定组后建议一并归入同一组合。`
    );
  }

  if (relationCount === 1) {
    warnings.push(
      '该残片仅建立了 1 条缀合关系，建议补充更多证据以增强定组可靠性。'
    );
  }

  return {
    valid: true,
    message: warnings.length > 0
      ? `可以定组，但有 ${warnings.length} 条建议需要注意。`
      : '定组条件满足，可以标记为已定组。',
    details: {
      hasRelations,
      relationCount,
      hasConflicts,
      conflictDetails,
      hasHighConfidenceRelations,
      highConfidenceCount,
      connectedToGrouped,
      connectedGroupedIds,
      minConfidenceOk,
      minConfidenceValue
    },
    warnings
  };
}

export function validateAddRelation(
  sourceId: string,
  targetId: string,
  type: RelationType,
  confidence: number,
  notes: string,
  relations: Relation[],
  excludeId?: string
): ValidationResult {
  const selfCheck = validateSelfRelation(sourceId, targetId);
  if (!selfCheck.valid) return selfCheck;

  const duplicateCheck = validateDuplicateRelation(
    sourceId,
    targetId,
    type,
    confidence,
    notes,
    relations,
    excludeId
  );
  if (!duplicateCheck.valid) return duplicateCheck;

  const confidenceCheck = validateConfidence(confidence);
  if (!confidenceCheck.valid) return confidenceCheck;

  return { valid: true, message: '' };
}

export interface RelationExistenceHint {
  sameTypeExists: boolean;
  sameTypeRelations: Relation[];
  otherTypeExists: boolean;
  otherTypeRelations: Relation[];
  fragmentCodes?: [string, string];
}

export function getRelationExistenceHint(
  sourceId: string,
  targetId: string,
  type: RelationType,
  relations: Relation[],
  fragments?: Fragment[],
  excludeId?: string
): RelationExistenceHint {
  const sameTypeRelations: Relation[] = [];
  const otherTypeRelations: Relation[] = [];

  relations.forEach((r) => {
    if (excludeId && r.id === excludeId) return;
    const samePair =
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId);
    if (!samePair) return;

    if (r.type === type) {
      sameTypeRelations.push(r);
    } else {
      otherTypeRelations.push(r);
    }
  });

  let fragmentCodes: [string, string] | undefined;
  if (fragments) {
    const s = fragments.find((f) => f.id === sourceId);
    const t = fragments.find((f) => f.id === targetId);
    if (s && t) fragmentCodes = [s.code, t.code];
  }

  return {
    sameTypeExists: sameTypeRelations.length > 0,
    sameTypeRelations,
    otherTypeExists: otherTypeRelations.length > 0,
    otherTypeRelations,
    fragmentCodes
  };
}
