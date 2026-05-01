import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// Set EXPO_PUBLIC_API_URL in your .env file, e.g.:
//   EXPO_PUBLIC_API_URL=http://192.168.1.x:8000/api
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://127.0.0.1:8000/api'

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