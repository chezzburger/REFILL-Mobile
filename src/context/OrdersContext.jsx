import { createContext, useContext, useState, useEffect } from 'react'
import { ordersAPI } from '../api/orders'
import { useAuth } from './AuthContext'

const OrdersContext = createContext(null)

export function OrdersProvider({ children }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrders = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const r = await ordersAPI.getAll()
      const data = Array.isArray(r.data) ? r.data : r.data?.results || []
      setOrders(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) { setOrders([]); return }
    fetchOrders()
  }, [user])

  const createOrder = async (payload) => {
    setError(null)
    try {
      const res = await ordersAPI.create(payload)
      const newOrder = res.data
      setOrders(prev => [newOrder, ...prev])
      return { success: true, data: newOrder }
    } catch (err) {
      const errors = err.response?.data || { detail: 'Failed to create order.' }
      setError(JSON.stringify(errors))
      return { success: false, errors }
    }
  }

  const updateOrder = async (id, payload) => {
    setError(null)
    try {
      const res = await ordersAPI.update(id, payload)
      const updated = res.data
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)))
      return { success: true, data: updated }
    } catch (err) {
      const errors = err.response?.data || { detail: 'Failed to update order.' }
      setError(JSON.stringify(errors))
      return { success: false, errors }
    }
  }

  const cancelOrder = async (id) => {
    setError(null)
    try {
      await ordersAPI.cancel(id)
      setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'cancelled' } : o)))
      return { success: true }
    } catch (err) {
      const errors = err.response?.data || { detail: 'Failed to cancel order.' }
      setError(JSON.stringify(errors))
      return { success: false, errors }
    }
  }

  const deleteOrder = async (id) => {
    setError(null)
    try {
      await ordersAPI.delete(id)
      setOrders(prev => prev.filter(o => o.id !== id))
      return { success: true }
    } catch (err) {
      const errors = err.response?.data || { detail: 'Failed to delete order.' }
      setError(JSON.stringify(errors))
      return { success: false, errors }
    }
  }

  const addOrder = (order) => setOrders(prev => [order, ...prev])

  // Alias for TrackPage
  const refreshOrders = fetchOrders

  return (
    <OrdersContext.Provider value={{
      orders, loading, error,
      fetchOrders, createOrder, addOrder,
      updateOrder, cancelOrder, deleteOrder,
      setOrders, refreshOrders,
    }}>
      {children}
    </OrdersContext.Provider>
  )
}

export const useOrders = () => useContext(OrdersContext)
