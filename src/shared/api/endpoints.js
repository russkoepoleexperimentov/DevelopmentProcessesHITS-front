import client from './client';

// ─── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (body) => client.post('/auth/register', body),
  login: (body) => client.post('/auth/login', body),
  logout: () => client.post('/auth/logout'),
  refresh: () => client.post('/auth/refresh'),
};

// ─── Users ─────────────────────────────────────────────────
export const usersAPI = {
  me: () => client.get('/users'),
  getById: (id) => client.get(`/users/${id}`),
  update: (body) => client.put('/users', body),
};

// ─── Courses ───────────────────────────────────────────────
export const courseAPI = {
  create: (body) => client.post('/course', body),
  myCourses: () => client.get('/user/courses'),
  getById: (id) => client.get(`/course/${id}`),
  update: (id, body) => client.put(`/course/${id}`, body),
  join: (inviteCode) => client.post('/course/join', { inviteCode }),
  leave: (id) => client.delete(`/course/${id}/leave`),

  // Feed
  getFeed: (id, skip = 0, take = 10) =>
    client.get(`/course/${id}/feed?skip=${skip}&take=${take}`),

  // Members
  getMembers: (id, skip = 0, take = 20, query = '') =>
    client.get(
      `/course/${id}/members?skip=${skip}&take=${take}${query ? `&query=${encodeURIComponent(query)}` : ''}`
    ),
  changeMemberRole: (courseId, userId, role) =>
    client.put(`/course/${courseId}/members/${userId}/role`, { role }),
  removeMember: (courseId, userId) =>
    client.delete(`/course/${courseId}/members/${userId}`),

  // Posts / Tasks
  createPost: (courseId, body) => client.post(`/course/${courseId}/task`, body),
};

// ─── Posts ──────────────────────────────────────────────────
export const postAPI = {
  getById: (id) => client.get(`/post/${id}`),
  update: (id, body) => client.put(`/post/${id}`, body),
  delete: (id) => client.delete(`/post/${id}`),
};

// ─── Solutions ─────────────────────────────────────────────
export const solutionAPI = {
  // Отправить решение (с самооценкой)
  submit: (taskId, body) => client.put(`/task/${taskId}/solution`, body),
  
  // Удалить решение
  delete: (taskId) => client.delete(`/task/${taskId}/solution`),
  
  // Получить МОЁ решение (с breakdown, selfAssessment, teacherEvaluation)
  // Этот метод уже возвращает полную информацию, включая breakdown
  getMine: (taskId) => client.get(`/task/${taskId}/solution`),
  
  // Получить ВСЕ решения по заданию (для преподавателя)
  getAll: (taskId, skip = 0, take = 20, status = '', studentId = '') => {
    let url = `/task/${taskId}/solutions?skip=${skip}&take=${take}`;
    if (status) url += `&status=${status}`;
    if (studentId) url += `&studentId=${studentId}`;
    return client.get(url);
  },
  
  // Отправить оценку решения (с evaluation)
  review: (solutionId, body) =>
    client.post(`/solution/${solutionId}/review`, body),
  
  // Предпросмотр оценки перед отправкой (возвращает breakdown)
  previewGrade: (solutionId, evaluation) =>
    client.post(`/solution/${solutionId}/preview`, { evaluation }),
  
  // Получить решение по ID с полной детализацией (для преподавателя при просмотре)
  getById: (solutionId) => client.get(`/solution/${solutionId}`),
};

// ─── Comments ──────────────────────────────────────────────
export const commentAPI = {
  addToPost: (postId, text) =>
    client.post(`/post/${postId}/comment`, { text }),
  addToSolution: (solutionId, text) =>
    client.post(`/solution/${solutionId}/comment`, { text }),
  getForPost: (postId) => client.get(`/post/${postId}/comment`),
  getForSolution: (solutionId) =>
    client.get(`/solution/${solutionId}/comment`),
  getReplies: (commentId) => client.get(`/comment/${commentId}/replies`),
  reply: (commentId, text) =>
    client.post(`/comment/${commentId}/reply`, { text }),
  update: (commentId, text) =>
    client.put(`/comment/${commentId}`, { text }),
  delete: (commentId) => client.delete(`/comment/${commentId}`),
};

// ─── Files ─────────────────────────────────────────────────
export const filesAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUrl: (id) => {
    const base = import.meta.env.VITE_API_HOST || 'http://176.209.147.7:5000/api';
    return `${base}/files/${id}`;
  },
};

// ─── Teams ──────────────────────────────────────────────────
// (опционально, для командных заданий в будущем)
export const teamAPI = {
  getMyTeam: (assignmentId) => client.get(`/team-task/${assignmentId}/my-team`),
  getTeams: (assignmentId) => client.get(`/team-task/${assignmentId}/teams`),
  join: (teamId) => client.post(`/teams/${teamId}/join`),
  leave: (teamId) => client.post(`/teams/${teamId}/leave`),
  isCaptain: (teamId) => client.get(`/teams/${teamId}/is-captain`),
  transferCaptain: (teamId, toUserId) =>
    client.post(`/teams/${teamId}/transfer-captain/${toUserId}`),
  startVoting: (teamId) => client.post(`/teams/${teamId}/start-voting`),
  vote: (teamId, candidateId) =>
    client.post(`/teams/${teamId}/vote/${candidateId}`),
};

// ─── Grade Distribution ────────────────────────────────────
// (для командных заданий)
export const gradeDistributionAPI = {
  get: (teamId, assignmentId) =>
    client.get(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution`),
  update: (teamId, assignmentId, entries) =>
    client.put(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution`, { entries }),
  vote: (teamId, assignmentId, vote) =>
    client.post(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution/vote`, { vote }),
};