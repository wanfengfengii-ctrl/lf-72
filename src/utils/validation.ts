import { Fragment, Relation, RelationType, ValidationResult } from '@/types';

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
  relations: Relation[],
  excludeId?: string
): ValidationResult {
  const hasSameType = relations.some((r) => {
    if (r.id === excludeId) return false;
    const samePair =
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId);
    return samePair && r.type === type;
  });

  if (hasSameType) {
    return {
      valid: false,
      message: '同一对残片不能重复建立同类型的缀合关系'
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

export function validateAddRelation(
  sourceId: string,
  targetId: string,
  type: RelationType,
  confidence: number,
  relations: Relation[],
  excludeId?: string
): ValidationResult {
  const selfCheck = validateSelfRelation(sourceId, targetId);
  if (!selfCheck.valid) return selfCheck;

  const duplicateCheck = validateDuplicateRelation(
    sourceId,
    targetId,
    type,
    relations,
    excludeId
  );
  if (!duplicateCheck.valid) return duplicateCheck;

  const confidenceCheck = validateConfidence(confidence);
  if (!confidenceCheck.valid) return confidenceCheck;

  return { valid: true, message: '' };
}
