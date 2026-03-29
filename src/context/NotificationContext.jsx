import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import apiClient from '../api/client'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const isLoggedIn = async () => {
    const token = await AsyncStorage.getItem('authToken')
    return !!token
  }

  const fetchNotifications = useCallback(async () => {
    if (!(await isLoggedIn())) return
    setLoading(true)
    try {
      const r = await apiClient.get('/notifications/')
      const data = Array.isArray(r.data) ? r.data : r.data?.results || []
      setNotifications(data)
    } catch (err) {
      if (err.response?.status === 401) {
        setNotifications([])
        return
      }
      console.error('Notifications fetch failed:', err.response?.status)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(async () => {
      if (!(await isLoggedIn())) return
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/`, { is_read: true })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (err) {
      console.error('Mark read failed:', err.response?.status)
    }
  }

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark_all_read/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Mark all read failed:', err.response?.status)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, loading,
      fetchNotifications, markRead, markAllRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
