import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { productsAPI } from '../api/products'
import StationModal from '../modals/StationModal'

const fmt = (n) => `₱${Number(n).toLocaleString()}`

const toStation = (product) => ({
  id:             product.id,
  name:           product.name,
  description:    product.description || '',
  waterTypes:     product.category_name ? [product.category_name] : ['Purified'],
  pricePerGallon: parseFloat(product.price) || 0,
  deliveryFee:    parseFloat(product.delivery_fee) || 0,
  eta:            product.eta || '—',
  distance:       '—',
  rating:         null,
  stock:          product.stock ?? 0,
  open:           product.is_active !== false,
})

const QUICK_ACTIONS = [
  { id: 'browse',   icon: '🛒', label: 'Refill Now' },
  { id: 'schedule', icon: '📅', label: 'Schedule'   },
  { id: 'history',  icon: '📋', label: 'History'    },
]

export default function HomeScreen({ navigate }) {
  const { user } = useAuth()
  const { orders } = useOrders()
  const [stations, setStations] = useState([])
  const [loadingStations, setLoading] = useState(true)
  const [stationsError, setStationsError] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true); setStationsError(null)
      try {
        const res = await productsAPI.getAll()
        const data = res.data
        console.log('[HomeScreen] products response:', JSON.stringify(data))
        const list = Array.isArray(data) ? data : (data.results ?? [])
        setStations(list.map(toStation))
      } catch {
        setStationsError('Could not load stations. Please try again.')
      } finally { setLoading(false) }
    }
    fetchStations()
  }, [])

  const recentOrders = orders.slice(0, 3)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.topbar}>
        <Text style={styles.greeting}>Hello, {user?.username} 👋</Text>
        <Text style={styles.location}>📍 Carmen, Cagayan de Oro</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map(a => (
          <TouchableOpacity key={a.id} style={styles.quickCard} onPress={() => navigate(a.id)}>
            <Text style={styles.quickIcon}>{a.icon}</Text>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nearby Stations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Stations</Text>

        {loadingStations && <ActivityIndicator color="#0f4c8a" style={{ marginTop: 12 }} />}

        {!loadingStations && stationsError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {stationsError}</Text>
          </View>
        )}

        {!loadingStations && !stationsError && stations.length === 0 && (
          <Text style={styles.emptyText}>No stations available.</Text>
        )}

        {!loadingStations && !stationsError && stations.map(station => (
          <View key={station.id} style={styles.stationCard}>
            <View style={styles.stationHeader}>
              <View style={styles.stationLeft}>
                <Text style={styles.stationIcon}>💧</Text>
                <View>
                  <TouchableOpacity onPress={() => setSelectedStation(station)}>
                    <Text style={styles.stationName}>{station.name}</Text>
                  </TouchableOpacity>
                  {station.waterTypes.length > 0 && (
                    <View style={styles.tagRow}>
                      {station.waterTypes.map(t => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              {station.rating && (
                <Text style={styles.rating}>⭐ {station.rating}</Text>
              )}
            </View>

            <View style={styles.stationInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PER GALLON</Text>
                <Text style={styles.infoVal}>{fmt(station.pricePerGallon)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>STOCK</Text>
                <Text style={styles.infoVal}>{station.stock} gal</Text>
              </View>
            </View>

            <View style={styles.stationActions}>
              <TouchableOpacity
                style={styles.orderBtn}
                onPress={() => setSelectedStation(station)}
              >
                <Text style={styles.orderBtnText}>🛒 Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calBtn}
                onPress={() => navigate('schedule', { station })}
              >
                <Text style={styles.calBtnText}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.length === 0 && (
          <Text style={styles.emptyText}>No recent orders yet.</Text>
        )}
        {recentOrders.map(o => {
          const label = o.notes || o.shipping_address || 'Water Station'
          const qty = Array.isArray(o.items) && o.items.length > 0
            ? (o.items[0].quantity || o.items[0].qty || 0)
            : (o.qty || o.quantity || 0)
          const total = o.total_price || o.total || 0
          return (
            <View key={o.id} style={styles.orderCard}>
              <View>
                <Text style={styles.orderLabel}>{label}</Text>
                <Text style={styles.orderQty}>{qty} gal</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderStatus}>{o.status}</Text>
                <Text style={styles.orderTotal}>{fmt(total)}</Text>
              </View>
            </View>
          )
        })}
      </View>

      {selectedStation && (
        <StationModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onOrder={s => { setSelectedStation(null); navigate('order', { station: s }) }}
          onSchedule={s => { setSelectedStation(null); navigate('schedule', { station: s }) }}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  topbar: { marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  location: { fontSize: 13, color: '#64748b', marginTop: 4 },
  quickGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickCard: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 13 },
  stationCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  stationLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  stationIcon: { fontSize: 24 },
  stationName: { fontSize: 15, fontWeight: '700', color: '#0f4c8a' },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: { backgroundColor: '#dbeafe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, color: '#1d4ed8' },
  rating: { fontSize: 13, color: '#f59e0b', fontWeight: '700' },
  stationInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoItem: {},
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  infoVal: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  stationActions: { flexDirection: 'row', gap: 8 },
  orderBtn: {
    flex: 1, backgroundColor: '#0f4c8a', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  calBtn: {
    backgroundColor: '#f1f5f9', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  calBtnText: { fontSize: 16 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  orderLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  orderQty: { fontSize: 13, color: '#64748b', marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderStatus: { fontSize: 12, color: '#0f4c8a', fontWeight: '600', textTransform: 'capitalize' },
  orderTotal: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
})
