// src/shared/utils/convertCriteria.js

/**
 * Конвертация критериев из формата бэкенда в формат фронтенда (для SelfAssessmentForm и GradeForm)
 * @param {Array} criteriaArray - массив критериев из бэкенда
 * @returns {Object} - объект с разделёнными типами критериев
 */
export const convertBackendToFrontend = (criteriaArray) => {
  if (!criteriaArray || criteriaArray.length === 0) return null;
  
  const config = {
    weightedCriteria: [],
    bonusPenalties: [],
    qualityCoefficients: [],
    blockingModifiers: []
  };
  
  criteriaArray.forEach(c => {
    switch (c.type) {
      case 'weighted':
        config.weightedCriteria.push({
          id: c.id,
          title: c.title,
          maxPoints: c.maxScore,
          weight: c.weight
        });
        break;
      case 'bonusPenalty':
        config.bonusPenalties.push({
          id: c.id,
          title: c.title,
          score: Math.abs(c.score),
          direction: c.direction === 'add' ? 'ADD' : 'SUBTRACT'
        });
        break;
      case 'quality':
        config.qualityCoefficients.push({
          id: c.id,
          title: c.title,
          threshold: c.threshold,
          score: c.score,
          direction: c.direction === 'add' ? 'ADD' : 'SUBTRACT',
          enabled: true
        });
        break;
      case 'blocking':
        config.blockingModifiers.push({
          id: c.id,
          title: c.title,
          maxAllowedScore: c.maxAllowedScore,
          enabled: true
        });
        break;
      default:
        break;
    }
  });
  
  return config;
};

/**
 * Нормализация весов критериев (сумма должна быть равна 1)
 * @param {Array} weightedCriteria - массив весовых критериев
 * @returns {Array} - нормализованный массив
 */
const normalizeWeights = (weightedCriteria) => {
  if (!weightedCriteria || weightedCriteria.length === 0) return weightedCriteria;
  
  const totalWeight = weightedCriteria.reduce((sum, w) => sum + (w.weight || 0), 0);
  
  if (Math.abs(totalWeight - 1) < 0.001) {
    return weightedCriteria;
  }
  
  console.log(`⚠️ Нормализация весов: сумма = ${totalWeight}, нормализуем до 1`);
  return weightedCriteria.map(w => ({
    ...w,
    weight: w.weight / totalWeight
  }));
};

/**
 * Конвертация критериев из формата фронтенда в формат бэкенда
 * @param {Object} frontendConfig - объект с разделёнными типами критериев
 * @param {number} globalMaxScore - максимальный балл задания (для ограничения)
 * @returns {Array} - массив критериев для бэкенда
 */
export const convertFrontendToBackend = (frontendConfig, globalMaxScore = 5) => {
  console.log('🔵 [convertFrontendToBackend] Входные данные:', frontendConfig);
  console.log('🔵 [convertFrontendToBackend] globalMaxScore:', globalMaxScore);
  
  if (!frontendConfig) {
    console.log('🔴 [convertFrontendToBackend] Нет входных данных');
    return null;
  }
  
  const criteria = [];
  
  // ВЕСОВЫЕ КРИТЕРИИ - МИНИМАЛЬНЫЙ ФОРМАТ
  let weightedCriteria = frontendConfig.weightedCriteria || [];
  const normalizedWeightedCriteria = normalizeWeights(weightedCriteria);
  
  normalizedWeightedCriteria.forEach(w => {
    const criterionMaxScore = Math.min(w.maxPoints || 10, globalMaxScore);
    
    // МИНИМАЛЬНЫЙ набор полей
    criteria.push({
      type: 'weighted',
      title: w.title,
      maxScore: criterionMaxScore,
      weight: w.weight
    });
  });
  
  // Бонусы/штрафы (type: "bonusPenalty") - минимальный формат
  const bonusPenalties = frontendConfig.bonusPenalties || [];
  bonusPenalties.forEach(bp => {
    criteria.push({
      type: 'bonusPenalty',
      title: bp.title,
      score: Math.abs(bp.score),
      direction: bp.direction === 'ADD' ? 'add' : 'subtract'
    });
  });
  
  // Коэффициенты качества (type: "quality") - минимальный формат
  const qualityCoefficients = frontendConfig.qualityCoefficients || [];
  qualityCoefficients.forEach(q => {
    criteria.push({
      type: 'quality',
      title: q.title,
      threshold: q.threshold || 0,
      score: q.score || 0,
      direction: q.direction === 'ADD' ? 'add' : 'subtract'
    });
  });
  
  // Блокирующие модификаторы (type: "blocking") - минимальный формат
  const blockingModifiers = frontendConfig.blockingModifiers || [];
  blockingModifiers.forEach(b => {
    criteria.push({
      type: 'blocking',
      title: b.title,
      maxAllowedScore: b.maxAllowedScore || 0
    });
  });
  
  console.log('🟢 [convertFrontendToBackend] Выходные данные:', JSON.stringify(criteria, null, 2));
  return criteria;
};

/**
 * Конвертация полной конфигурации задания (с порогами и настройками)
 * @param {Object} post - объект поста/задания из бэкенда
 * @returns {Object} - полная конфигурация для фронтенда
 */
export const convertFullPostConfig = (post) => {
  if (!post) return null;
  
  const frontendConfig = convertBackendToFrontend(post.criteria);
  
  if (!frontendConfig) return null;
  
  return {
    ...frontendConfig,
    failThreshold: post.failThreshold,
    successThreshold: post.successThreshold,
    studentScoreWeight: post.studentScoreWeight,
    penaltyPerDay: post.penaltyPerDay,
    maxDays: post.maxDays,
    maxScore: post.maxScore
  };
};

/**
 * Создание пустой конфигурации критериев для нового задания
 * @returns {Object} - пустая конфигурация с дефолтными значениями
 */
export const createEmptyCriteriaConfig = () => ({
  weightedCriteria: [
    { id: 'w1', title: 'Функциональность', maxPoints: 10, weight: 1.0 }
  ],
  bonusPenalties: [],
  qualityCoefficients: [],
  blockingModifiers: [],
  failThreshold: null,
  successThreshold: null,
  studentScoreWeight: 0,
  penaltyPerDay: 0,
  maxDays: 0
});

/**
 * Валидация конфигурации критериев
 * @param {Object} config - конфигурация для проверки
 * @returns {Object} - результат валидации { isValid, errors }
 */
export const validateCriteriaConfig = (config) => {
  const errors = [];
  
  if (config.weightedCriteria && config.weightedCriteria.length > 0) {
    const totalWeight = config.weightedCriteria.reduce((sum, w) => sum + (w.weight || 0), 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      errors.push(`Сумма весов критериев должна быть равна 1 (сейчас ${totalWeight.toFixed(2)})`);
    }
    
    config.weightedCriteria.forEach(w => {
      if (w.maxPoints <= 0) {
        errors.push(`У критерия "${w.title}" максимальный балл должен быть больше 0`);
      }
      if (w.weight <= 0 || w.weight > 1) {
        errors.push(`У критерия "${w.title}" вес должен быть в диапазоне (0, 1]`);
      }
    });
  }
  
  if (config.penaltyPerDay > 0 && config.maxDays <= 0) {
    errors.push('Если указан штраф за просрочку, максимальное количество дней должно быть больше 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};