import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import apiClient from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load persisted user on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('authUser')
        if (stored) setUser(JSON.parse(stored))
      } catch {}
      setLoading(false)
    }
    loadUser()
  }, [])

  const login = async (username, password) => {
    const res = await apiClient.post('/auth/token/login/', { username, password })
    const { auth_token } = res.data
    await AsyncStorage.setItem('authToken', auth_token)

    const userRes = await apiClient.get('/auth/users/me/')
    const userData = userRes.data
    await AsyncStorage.setItem('authUser', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/token/logout/')
    } catch {}
    await AsyncStorage.removeItem('authToken')
    await AsyncStorage.removeItem('authUser')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
