import apiClient from './client'

export const productsAPI = {
  getAll: (params = {}) => apiClient.get('/products/', { params }),
  getById: (id) => apiClient.get(`/products/${id}/`),
  create: (data) => apiClient.post('/products/', data),
  update: (id, data) => apiClient.patch(`/products/${id}/`, data),
  delete: (id) => apiClient.delete(`/products/${id}/`),
  getCategories: () => apiClient.get('/products/categories/'),
  getCategoryById: (id) => apiClient.get(`/products/categories/${id}/`),
  createCategory: (data) => apiClient.post('/products/categories/', data),
  updateCategory: (id, data) => apiClient.patch(`/products/categories/${id}/`, data),
  deleteCategory: (id) => apiClient.delete(`/products/categories/${id}/`),
}
