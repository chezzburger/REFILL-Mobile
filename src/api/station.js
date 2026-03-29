import apiClient from './client'

export const stationsAPI = {
  getAll: (params = {}) => apiClient.get('/stations/', { params }),
  getById: (id) => apiClient.get(`/stations/${id}/`),
  getNearby: (params = {}) => apiClient.get('/stations/nearby/', { params }),
}
