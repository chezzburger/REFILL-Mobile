import apiClient from './client'

export const usersAPI = {
  getAll: () => apiClient.get('/auth/users/'),
  getCurrentUser: () => apiClient.get('/auth/users/me/'),
  getById: (id) => apiClient.get(`/auth/users/${id}/`),
  getProfiles: () => apiClient.get('/auth/profiles/'),
  getMyProfile: () => apiClient.get('/auth/profiles/my_profile/'),
  getProfileById: (id) => apiClient.get(`/auth/profiles/${id}/`),
  updateProfile: (id, data) => apiClient.patch(`/auth/profiles/${id}/`, data),
  deleteProfile: (id) => apiClient.delete(`/auth/profiles/${id}/`),
}
