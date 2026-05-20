// src/shared/types/assessment.ts

export interface WeightedCriterion {
  id: string;
  title: string;
  maxPoints: number;
  weight: number;  // 0..1
}

export interface BonusPenaltyCriterion {
  id: string;
  title: string;
  score: number;
  direction: 'ADD' | 'SUBTRACT';
}

export interface QualityCoefficient {
  id: string;
  title: string;
  threshold: number;  // 0..1
  score: number;
  direction: 'ADD' | 'SUBTRACT';
}

export interface BlockingModifier {
  id: string;
  title: string;
  maxAllowedScore: number;
}

export interface CriteriaConfig {
  weightedCriteria: WeightedCriterion[];
  bonusPenalties: BonusPenaltyCriterion[];
  qualityCoefficients: QualityCoefficient[];
  blockingModifiers: BlockingModifier[];
  failThreshold?: number;      // порог незачёта
  successThreshold?: number;   // порог автомата
  studentScoreWeight?: number; // вес самооценки
  penaltyPerDay?: number;
  maxDays?: number;
}

// Для отправки оценки
export interface EvaluationData {
  weightedValues: { criterionId: string; score: number }[];
  toggledValues: { criterionId: string; enabled: boolean }[];
}