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
  search: (query) => client.get(`/users/search?query=${encodeURIComponent(query)}`),
};

// ─── Courses ───────────────────────────────────────────────
export const courseAPI = {
  create: (body) => client.post('/course', body),
  myCourses: () => client.get('/user/courses'),
  getById: (id) => client.get(`/course/${id}`),
  update: (id, body) => client.put(`/course/${id}`, body),
  join: (inviteCode) => client.post('/course/join', { inviteCode }),
  leave: (id) => client.delete(`/course/${id}/leave`),

  getFeed: (id, skip = 0, take = 10) =>
    client.get(`/course/${id}/feed?skip=${skip}&take=${take}`),

  getMembers: (id, skip = 0, take = 20, query = '') =>
    client.get(
      `/course/${id}/members?skip=${skip}&take=${take}${query ? `&query=${encodeURIComponent(query)}` : ''}`
    ),
  changeMemberRole: (courseId, userId, role) =>
    client.put(`/course/${courseId}/members/${userId}/role`, { role }),
  removeMember: (courseId, userId) =>
    client.delete(`/course/${courseId}/members/${userId}`),

  createPost: (courseId, body) => client.post(`/course/${courseId}/task`, body),
};

// ─── Posts ──────────────────────────────────────────────────
export const postAPI = {
  getById: (id) => client.get(`/post/${id}`),
  update: (id, body) => client.put(`/post/${id}`, body),
  delete: (id) => client.delete(`/post/${id}`),
};

// ─── Individual Solutions ────────────────────────────────────
export const solutionAPI = {
  submit: (taskId, body) => client.put(`/task/${taskId}/solution`, body),
  delete: (taskId) => client.delete(`/task/${taskId}/solution`),
  getMine: (taskId) => client.get(`/task/${taskId}/solution`),
  getAll: (taskId, skip = 0, take = 20, status = '', studentId = '') => {
    let url = `/task/${taskId}/solutions?skip=${skip}&take=${take}`;
    if (status) url += `&status=${status}`;
    if (studentId) url += `&studentId=${studentId}`;
    return client.get(url);
  },
  review: (solutionId, body) =>
    client.post(`/solution/${solutionId}/review`, body),
};

// ─── Team Tasks ─────────────────────────────────────────────
export const teamTaskAPI = {
  create: (courseId, body) =>
    client.post(`/course/${courseId}/task`, {
      ...body,
      type: 'teaM_TASK'
    }),

  getMyTeam: (assignmentId) =>
    client.get(`/team-task/${assignmentId}/my-team`),

  getTeams: (assignmentId) =>
    client.get(`/team-task/${assignmentId}/teams`),

  getTeamsForTeacher: (assignmentId) =>
    client.get(`/teacher/team-task/${assignmentId}/teams`),

  submitSolution: (taskId, body) =>
    client.put(`/team-task/${taskId}/solution`, body),

  getMySolution: (taskId) =>
    client.get(`/team-task/${taskId}/solution`),

  getAllSolutions: (taskId, skip = 0, take = 20, status = '', teamId = '') => {
    let url = `/team-task/${taskId}/solutions?skip=${skip}&take=${take}`;
    if (status) url += `&status=${status}`;
    if (teamId) url += `&teamId=${teamId}`;
    return client.get(url);
  },

  reviewSolution: (solutionId, body) =>
    client.post(`/team-solution/${solutionId}/review`, body),

  getTaskDetails: (taskId) =>
    client.get(`/post/${taskId}`),
};

// ─── Team Solution API (для удобства) ────────────────────────
export const teamSolutionAPI = {
  submit: (taskId, body) => client.put(`/team-task/${taskId}/solution`, body),
  getMy: (taskId) => client.get(`/team-task/${taskId}/solution`),
  getAll: (taskId, skip = 0, take = 20, status = '', teamId = '') => {
    let url = `/team-task/${taskId}/solutions?skip=${skip}&take=${take}`;
    if (status) url += `&status=${status}`;
    if (teamId) url += `&teamId=${teamId}`;
    return client.get(url);
  },
  review: (solutionId, body) => client.post(`/team-solution/${solutionId}/review`, body),
};

// ─── Teams ───────────────────────────────────────────────────
export const teamAPI = {
  join: (teamId) =>
    client.post(`/teams/${teamId}/join`),

  leave: (teamId) =>
    client.post(`/teams/${teamId}/leave`),

  transferCaptain: (teamId, toUserId) =>
    client.post(`/teams/${teamId}/transfer-captain/${toUserId}`),

  isCaptain: (teamId) =>
    client.get(`/teams/${teamId}/is-captain`),

  startVoting: (teamId) =>
    client.post(`/teams/${teamId}/start-voting`),

  vote: (teamId, candidateId) =>
    client.post(`/teams/${teamId}/vote/${candidateId}`),

  rename: (teamId, newName) =>
    client.put(`/teacher/teams/${teamId}/rename`, { newName }),

  addStudent: (teamId, studentId) =>
    client.post(`/teacher/teams/${teamId}/add-student/${studentId}`),

  removeStudent: (teamId, studentId) =>
    client.delete(`/teacher/teams/${teamId}/remove-student/${studentId}`),

  setFixedCaptain: (teamId, captainId) =>
    client.post(`/teacher/teams/${teamId}/fixed-captain`, `"${captainId}"`, {
      headers: { 'Content-Type': 'application/json' },
    }),
};

// ─── Grade Distribution ──────────────────────────────────────
export const gradeDistributionAPI = {
  get: (teamId, assignmentId) =>
    client.get(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution`),

  update: (teamId, assignmentId, entries) =>
    client.put(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution`, { entries }),

  vote: (teamId, assignmentId, vote) =>
    client.post(`/teams/${teamId}/assignments/${assignmentId}/grade-distribution/vote`, { vote }),
};

// ─── Comments ────────────────────────────────────────────────
export const commentAPI = {
  addToPost: (postId, text) =>
    client.post(`/post/${postId}/comment`, { text }),
  addToSolution: (solutionId, text) =>
    client.post(`/solution/${solutionId}/comment`, { text }),
  addToTeamSolution: (solutionId, text) =>
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

// ─── Files ───────────────────────────────────────────────────
export const filesAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUrl: (id) => {
    const base = import.meta.env.VITE_API_HOST || 'http://localhost:5174/api';
    return `${base}/files/${id}`;
  },
};