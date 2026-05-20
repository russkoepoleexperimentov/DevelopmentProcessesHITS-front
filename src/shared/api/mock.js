// src/shared/api/mock.js
// Временные мок-данные для тестирования фронта

export const mockSolutionAPI = {
  getMine: async (taskId) => {
    console.log('MOCK: getMine', taskId);
    return {
      id: 'mock-solution-id',
      status: 'pending',
      score: null,
      text: '',
      files: [],
      updatedDate: new Date().toISOString(),
      selfAssessment: null,
      breakdown: null
    };
  },
  
  submit: async (taskId, body) => {
    console.log('MOCK: submit', taskId, body);
    await new Promise(r => setTimeout(r, 500));
    return { id: 'mock-solution-id' };
  },
  
  delete: async (taskId) => {
    console.log('MOCK: delete', taskId);
    return {};
  },
  
  getAll: async (taskId, skip, take, status) => {
    console.log('MOCK: getAll', taskId, { skip, take, status });
    return {
      records: [],
      totalRecords: 0
    };
  },
  
  review: async (solutionId, body) => {
    console.log('MOCK: review', solutionId, body);
    return { id: solutionId };
  },
  
  previewGrade: async (solutionId, evaluation) => {
    console.log('MOCK: previewGrade', solutionId, evaluation);
    return {
      baseScore: 8,
      latePenalty: 0,
      afterQualityCoefficient: 8,
      afterLatePenalty: 8,
      afterBlocking: 8,
      finalScore: 8,
      expiredDays: 0,
      thresholdApplied: false,
      thresholdReason: null
    };
  }
};