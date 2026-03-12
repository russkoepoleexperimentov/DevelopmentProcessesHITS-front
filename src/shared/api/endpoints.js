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
    const base = import.meta.env.VITE_API_HOST || 'http://localhost:5174/api';
    return `${base}/files/${id}`;
  },
};
