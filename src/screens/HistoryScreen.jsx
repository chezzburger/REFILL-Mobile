import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useOrders } from '../context/OrdersContext'
import { ordersAPI } from '../api/orders'

const fmt = (n) => `₱${Number(n).toLocaleString()}`

const STATUS_COLOR = {
  delivered:  { bg: '#d1fae5', color: '#059669' },
  pending:    { bg: '#fef3c7', color: '#d97706' },
  processing: { bg: '#dbeafe', color: '#1d4ed8' },
  shipped:    { bg: '#ede9fe', color: '#7c3aed' },
  cancelled:  { bg: '#fee2e2', color: '#dc2626' },
}

export default function HistoryScreen({ navigate }) {
  const { orders, loading, fetchOrders } = useOrders()
  const [hiding, setHiding] = useState(false)

  const getStyle = (status) =>
    STATUS_COLOR[status?.toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' }

  const handleHide = (id) => {
    Alert.alert('Delete Order', 'Are you sure you want to delete this order?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setHiding(true)
          try {
            await ordersAPI.hide(id)
            await fetchOrders()
          } catch {}
          finally { setHiding(false) }
        }
      }
    ])
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0f4c8a" /></View>
  )

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.count}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchOrders} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? '⟳ Refreshing…' : '↺ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No orders yet.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('browse')}>
            <Text style={styles.btnPrimaryText}>Browse Stations</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {orders.map(o => {
            const s = getStyle(o.status)
            const label = o.station || o.notes || o.shipping_address || '—'
            const qty = o.qty || o.quantity || '—'
            const total = fmt(o.total || o.total_price || 0)
            const date = o.date || o.created_at?.slice(0, 10) || '—'
            const isActive = ['pending', 'processing', 'shipped'].includes(o.status?.toLowerCase())
            const isDone   = ['delivered', 'cancelled'].includes(o.status?.toLowerCase())

            return (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardId}>#{o.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.color }]}>{o.status}</Text>
                  </View>
                </View>

                <Text style={styles.cardLabel} numberOfLines={2}>{label}</Text>

                <View style={styles.cardMeta}>
                  <Text style={styles.metaItem}>📅 {date}</Text>
                  <Text style={styles.metaItem}>💧 {qty !== '—' ? `${qty} gal` : '—'}</Text>
                  <Text style={styles.metaItem}>💰 {total}</Text>
                </View>

                <View style={styles.cardActions}>
                  {isActive && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigate('track', { orderId: o.id })}>
                      <Text style={styles.actionBtnText}>📍 Track</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigate('browse')}>
                    <Text style={styles.actionBtnText}>↻ Reorder</Text>
                  </TouchableOpacity>
                  {isDone && (
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleHide(o.id)}>
                      <Text style={[styles.actionBtnText, styles.deleteBtnText]}>✕ Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  count: { fontSize: 14, fontWeight: '600', color: '#334155' },
  refreshBtn: {},
  refreshText: { fontSize: 13, color: '#0f4c8a', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  btnPrimary: { backgroundColor: '#0f4c8a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardId: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaItem: { fontSize: 12, color: '#64748b' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  deleteBtn: { borderColor: '#fca5a5' },
  deleteBtnText: { color: '#dc2626' },
})
