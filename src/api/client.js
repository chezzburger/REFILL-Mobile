import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Replace VITE_API_BASE_URL with your actual backend URL
const API_BASE_URL = 'http://192.168.0.100:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('authToken')
  if (token) config.headers['Authorization'] = `Token ${token}`
  return config
})

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken')
      await AsyncStorage.removeItem('authUser')
      // Navigation reset handled by AuthContext
    }
    if (error.response?.status === 403) console.error('Permission denied')
    return Promise.reject(error)
  }
)

export default apiClient
