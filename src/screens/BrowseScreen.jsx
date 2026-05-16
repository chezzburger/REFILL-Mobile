import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native'
import { productsAPI } from '../api/products'
import StationModal from '../modals/StationModal'

const fmt = (n) => `₱${Number(n).toLocaleString()}`
const WATER_TYPES = ['All', 'Purified', 'Alkaline', 'Mineral']
const SORT_OPTIONS = [
  { id: 'distance', label: 'Nearest' },
  { id: 'price',    label: 'Cheapest' },
  { id: 'rating',   label: 'Top Rated' },
]

const ICONS = ['💧','🌊','⛲','⚡','🔵','⛰️','🫧','🏔️']

const toStation = (p, i) => ({
  id:             p.id,
  name:           p.name,
  icon:           ICONS[i % ICONS.length],
  distance:       '—',
  pricePerGallon: parseFloat(p.price) || 0,
  deliveryFee:    parseFloat(p.delivery_fee) || 0,
  eta:            p.eta || '—',
  rating:         null,
  waterTypes:     p.category_name ? [p.category_name] : ['Purified'],
  open:           p.is_active !== false,
})

export default function BrowseScreen({ navigate }) {
  const [stations,  setStations]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState('distance')
  const [selectedStation, setSelectedStation] = useState(null)

  const fetchStations = () => {
    setLoading(true)
    productsAPI.getAll()
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.results || [])
        setStations(data.map(toStation))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStations() }, [])

  const displayed = stations
    .filter(s => filter === 'All' || s.waterTypes.includes(filter))
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price')  return a.pricePerGallon - b.pricePerGallon
      if (sortBy === 'rating') return b.rating - a.rating
      return parseFloat(a.distance) - parseFloat(b.distance)
    })

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stations…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {WATER_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, filter === t && styles.chipActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.chipText, filter === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll} contentContainerStyle={styles.sortRow}>
        {SORT_OPTIONS.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.sortBtn, sortBy === s.id && styles.sortBtnActive]}
            onPress={() => setSortBy(s.id)}
          >
            <Text style={[styles.sortText, sortBy === s.id && styles.sortTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.resultsMeta}>{displayed.length} station{displayed.length !== 1 ? 's' : ''} found</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator color="#0f4c8a" style={{ marginTop: 48 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💧</Text>
            <Text style={styles.emptyText}>
              {stations.length === 0 ? 'No stations available yet.' : 'No stations match your filters'}
            </Text>
          </View>
        ) : (
          displayed.map(s => (
            <View key={s.id} style={[styles.card, !s.open && styles.cardClosed]}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardIcon}>{s.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => setSelectedStation(s)}>
                      <Text style={styles.cardName}>{s.name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.cardDist}>📍 {s.distance}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {!s.open && <Text style={styles.closedTag}>Closed</Text>}
                </View>
              </View>

              <View style={styles.typeRow}>
                {s.waterTypes.map(t => (
                  <View key={t} style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{t}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Per Gallon</Text>
                  <Text style={styles.infoVal}>{fmt(s.pricePerGallon)}</Text>
                </View>
                <View style={styles.infoDiv} />
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Delivery</Text>
                  <Text style={styles.infoVal}>{fmt(s.deliveryFee)}</Text>
                </View>
                <View style={styles.infoDiv} />
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>ETA</Text>
                  <Text style={styles.infoVal}>{s.eta}</Text>
                </View>
              </View>

              <View style={styles.cardBtns}>
                <TouchableOpacity
                  style={[styles.orderBtn, !s.open && styles.orderBtnDisabled]}
                  disabled={!s.open}
                  onPress={() => navigate('order', { station: s })}
                >
                  <Text style={styles.orderBtnText}>{s.open ? '🛒 Order Now' : 'Closed'}</Text>
                </TouchableOpacity>
                {s.open && (
                  <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => navigate('schedule', { station: s })}
                  >
                    <Text style={styles.scheduleBtnText}>📅</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {selectedStation && (
        <StationModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onOrder={s => { setSelectedStation(null); navigate('order', { station: s }) }}
          onSchedule={s => { setSelectedStation(null); navigate('schedule', { station: s }) }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 12, borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#0f4c8a', borderColor: '#0f4c8a' },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  sortScroll: { maxHeight: 40, marginTop: 8 },
  sortRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f1f5f9' },
  sortBtnActive: { backgroundColor: '#dbeafe' },
  sortText: { fontSize: 12, color: '#64748b' },
  sortTextActive: { color: '#1d4ed8', fontWeight: '700' },
  resultsMeta: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 12, color: '#94a3b8' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardClosed: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  cardIcon: { fontSize: 24 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#0f4c8a' },
  cardDist: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardRating: { fontSize: 13, color: '#f59e0b', fontWeight: '700' },
  closedTag: {
    backgroundColor: '#fee2e2', color: '#dc2626',
    fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeTag: { backgroundColor: '#dbeafe', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  typeTagText: { fontSize: 11, color: '#1d4ed8', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  infoVal: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  infoDiv: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  cardBtns: { flexDirection: 'row', gap: 8 },
  orderBtn: { flex: 1, backgroundColor: '#0f4c8a', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  orderBtnDisabled: { backgroundColor: '#94a3b8' },
  orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scheduleBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  scheduleBtnText: { fontSize: 16 },
})
