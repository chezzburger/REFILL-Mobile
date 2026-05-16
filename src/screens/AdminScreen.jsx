import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { ordersAPI } from '../api/orders'
import { productsAPI } from '../api/products'

const STATUS_COLORS = {
  pending:    { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  processing: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  shipped:    { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
  delivered:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
}
const STATUS_FLOW = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped',    'cancelled'],
  shipped:    ['delivered',  'cancelled'],
  delivered:  [],
  cancelled:  [],
}
const ALL_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const fmt = (n) => `₱${Number(n).toLocaleString()}`
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export default function AdminScreen({ navigate }) {
  const { user } = useAuth()
  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [activeTab,    setActiveTab]    = useState('orders')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId,   setExpandedId]   = useState(null)
  const [updatingId,   setUpdatingId]   = useState(null)
  const [error,        setError]        = useState(null)

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await ordersAPI.getAll()
      setOrders(res.data?.results ?? res.data ?? [])
    } catch {
      setError('Failed to load orders. Pull down to retry.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleRefresh = () => { setRefreshing(true); fetchOrders(true) }

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      await ordersAPI.updateStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch {}
    finally { setUpdatingId(null) }
  }

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length
    return acc
  }, {})
  counts.all = orders.length

  const totalGallons = orders.reduce((sum, o) => {
    if (!Array.isArray(o.items) || o.items.length === 0) return sum
    return sum + (o.items[0]?.quantity || 0)
  }, 0)

  const displayed = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  if (!user?.is_staff) {
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedIcon}>🚫</Text>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedSub}>This panel is for staff accounts only.</Text>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigate('home')}>
          <Text style={styles.btnBackText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['orders', 'stations'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'orders' ? '📋 Orders' : '💧 Stations'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stations' ? (
        <StationsTab />
      ) : (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0f4c8a" />}>
          <View style={styles.adminInfo}>
            <Text style={styles.adminTitle}>🛡️ Admin Dashboard</Text>
            <Text style={styles.adminSub}>Logged in as <Text style={styles.adminName}>{user.username}</Text> (Staff)</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {[
              { key: 'all', label: 'All', color: '#0f4c8a' },
              { key: 'pending', label: 'Pending', color: '#a16207' },
              { key: 'processing', label: 'Processing', color: '#1d4ed8' },
              { key: 'shipped', label: 'Shipped', color: '#7e22ce' },
              { key: 'delivered', label: 'Delivered', color: '#15803d' },
              { key: 'cancelled', label: 'Cancelled', color: '#dc2626' },
            ].map(({ key, label, color }) => (
              <TouchableOpacity key={key} style={[styles.statCard, filterStatus === key && { borderColor: color, borderWidth: 2 }]} onPress={() => setFilterStatus(key)}>
                <Text style={[styles.statNum, { color }]}>{counts[key] ?? 0}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{orders.length}</Text>
              <Text style={styles.summaryLabel}>ORDERS</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{totalGallons}</Text>
              <Text style={styles.summaryLabel}>GALLONS</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <Text style={styles.refreshBtnText}>{refreshing ? '…' : '↻ Refresh'}</Text>
            </TouchableOpacity>
          </View>

          {error && <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {error}</Text></View>}

          {loading ? (
            <ActivityIndicator color="#0f4c8a" style={{ marginTop: 40 }} />
          ) : displayed.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No {filterStatus !== 'all' ? filterStatus : ''} orders found.</Text>
            </View>
          ) : (
            <View style={styles.orderList}>
              {displayed.map(o => {
                const s = STATUS_COLORS[o.status] || STATUS_COLORS.pending
                const isExpanded = expandedId === o.id
                const isUpdating = updatingId === o.id
                const nextStatuses = STATUS_FLOW[o.status] || []
                const itemCount = Array.isArray(o.items) ? Math.min(o.items.length, 1) : 0
                const date = o.created_at
                  ? new Date(o.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'
                return (
                  <TouchableOpacity key={o.id} style={styles.orderCard} onPress={() => setExpandedId(isExpanded ? null : o.id)} activeOpacity={0.85}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.orderId}>#{o.id}</Text>
                        <Text style={styles.orderCustomer}>{o.user_email || `User #${o.user}`}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                        <Text style={[styles.statusText, { color: s.text }]}>{cap(o.status)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaItem}>📦 {itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                      <Text style={styles.metaItem}>💰 {fmt(o.total_price || 0)}</Text>
                      <Text style={styles.metaItem}>🗓 {date}</Text>
                    </View>
                    {isExpanded && (
                      <View style={styles.expanded}>
                        <View style={styles.expandDivider} />
                        {o.notes ? <Text style={styles.expandNote}>📝 {o.notes}</Text> : null}
                        <Text style={styles.expandAddr}>📍 {o.shipping_address || '—'}</Text>
                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <View style={styles.itemsBreakdown}>
                            <Text style={styles.itemRow}>
                              • {o.items[0].quantity ?? 1}x — {fmt(o.items[0].price)} ea{o.items[0].subtotal ? ` = ${fmt(o.items[0].subtotal)}` : ''}
                            </Text>
                            {o.items[1] && (
                              <Text style={styles.itemRow}>
                                🚚 Delivery: {fmt(o.items[1].price)}
                              </Text>
                            )}
                          </View>
                        )}
                        {nextStatuses.length > 0 && (
                          <View style={styles.actionRow}>
                            <Text style={styles.actionLabel}>Update status:</Text>
                            <View style={styles.actionBtns}>
                              {nextStatuses.map(ns => {
                                const nc = STATUS_COLORS[ns]
                                return (
                                  <TouchableOpacity key={ns} style={[styles.actionBtn, { backgroundColor: nc.bg, borderColor: nc.border }]} onPress={() => handleStatusChange(o.id, ns)} disabled={isUpdating}>
                                    {isUpdating
                                      ? <ActivityIndicator size="small" color={nc.text} />
                                      : <Text style={[styles.actionBtnText, { color: nc.text }]}>{cap(ns)}</Text>
                                    }
                                  </TouchableOpacity>
                                )
                              })}
                            </View>
                          </View>
                        )}
                        {nextStatuses.length === 0 && <Text style={styles.closedNote}>This order is closed — no further updates allowed.</Text>}
                      </View>
                    )}
                    <Text style={styles.expandHint}>{isExpanded ? '▲ Collapse' : '▼ Details'}</Text>
                  </TouchableOpacity>
                )
              })}
              <Text style={styles.listFooter}>Showing {displayed.length} of {orders.length} orders · Staff can update any order status</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

function StationsTab() {
  const [stations,        setStations]        = useState([])
  const [categories,      setCategories]      = useState([])
  const [loading,         setLoading]         = useState(true)
  const [showForm,        setShowForm]        = useState(false)
  const [editing,         setEditing]         = useState(null)
  const [saving,          setSaving]          = useState(false)
  const [deletingId,      setDeletingId]      = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [stationFilter,     setStationFilter]     = useState('all')
  const [expandedStationId, setExpandedStationId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', delivery_fee: '', eta: '', stock: '', is_active: true })
  const [formErrors, setFormErrors] = useState({})

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([productsAPI.getAll(), productsAPI.getCategories()])
      setStations(Array.isArray(pRes.data) ? pRes.data : (pRes.data?.results ?? []))
      setCategories(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results ?? []))
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', category: '', price: '', delivery_fee: '', eta: '', stock: '', is_active: true })
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name, description: s.description || '',
      category: s.category?.toString() ?? '',
      price: s.price?.toString() ?? '',
      delivery_fee: s.delivery_fee?.toString() ?? '',
      eta: s.eta || '', stock: s.stock?.toString() ?? '',
      is_active: s.is_active,
    })
    setFormErrors({})
    setShowForm(true)
  }

  const validateForm = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.category) e.category = 'Category is required'
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Valid price required'
    if (form.delivery_fee !== '' && isNaN(form.delivery_fee)) e.delivery_fee = 'Must be a number'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(), description: form.description.trim(),
      category: parseInt(form.category), price: parseFloat(form.price),
      delivery_fee: form.delivery_fee !== '' ? parseFloat(form.delivery_fee) : 0,
      eta: form.eta.trim(), stock: form.stock !== '' ? parseInt(form.stock) : 0,
      is_active: form.is_active,
    }
    try {
      if (editing) { await productsAPI.update(editing.id, payload) }
      else { await productsAPI.create(payload) }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const mapped = {}
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v })
        setFormErrors(mapped)
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    setDeletingId(id); setConfirmDeleteId(null)
    try { await productsAPI.delete(id); fetchAll() } catch {}
    finally { setDeletingId(null) }
  }

  const handleToggleActive = async (s) => {
    try { await productsAPI.update(s.id, { is_active: !s.is_active }); fetchAll() } catch {}
  }

  const activeStations   = stations.filter(s => s.is_active)
  const inactiveStations = stations.filter(s => !s.is_active)
  const displayedStations = stationFilter === 'active' ? activeStations
                          : stationFilter === 'inactive' ? inactiveStations
                          : stations

  if (showForm) return (
    <ScrollView style={sStyles.formScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={sStyles.formHeader}>
        <Text style={sStyles.formTitle}>{editing ? 'Edit Station' : 'Add Station'}</Text>
        <TouchableOpacity onPress={() => setShowForm(false)}>
          <Text style={sStyles.formClose}>✕ Cancel</Text>
        </TouchableOpacity>
      </View>

      <Text style={sStyles.label}>Station Name *</Text>
      <TextInput style={[sStyles.input, formErrors.name && sStyles.inputErr]} value={form.name} onChangeText={v => setForm(p => ({...p, name: v}))} placeholder="e.g. AquaPure Station" placeholderTextColor="#94a3b8" />
      {formErrors.name && <Text style={sStyles.errText}>{formErrors.name}</Text>}

      <Text style={sStyles.label}>Category *</Text>
      <View style={sStyles.pillRow}>
        {categories.map(c => (
          <TouchableOpacity key={c.id} style={[sStyles.pill, form.category === c.id.toString() && sStyles.pillActive]} onPress={() => setForm(p => ({...p, category: c.id.toString()}))}>
            <Text style={[sStyles.pillText, form.category === c.id.toString() && sStyles.pillTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {formErrors.category && <Text style={sStyles.errText}>{formErrors.category}</Text>}

      <View style={sStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={sStyles.label}>Price per Gallon *</Text>
          <TextInput style={[sStyles.input, formErrors.price && sStyles.inputErr]} value={form.price} onChangeText={v => setForm(p => ({...p, price: v}))} placeholder="₱0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
          {formErrors.price && <Text style={sStyles.errText}>{formErrors.price}</Text>}
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={sStyles.label}>Delivery Fee</Text>
          <TextInput style={[sStyles.input, formErrors.delivery_fee && sStyles.inputErr]} value={form.delivery_fee} onChangeText={v => setForm(p => ({...p, delivery_fee: v}))} placeholder="₱0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
          {formErrors.delivery_fee && <Text style={sStyles.errText}>{formErrors.delivery_fee}</Text>}
        </View>
      </View>

      <View style={sStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={sStyles.label}>ETA</Text>
          <TextInput style={sStyles.input} value={form.eta} onChangeText={v => setForm(p => ({...p, eta: v}))} placeholder="e.g. 15–25 min" placeholderTextColor="#94a3b8" />
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={sStyles.label}>Stock (gallons)</Text>
          <TextInput style={sStyles.input} value={form.stock} onChangeText={v => setForm(p => ({...p, stock: v}))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
        </View>
      </View>

      <Text style={sStyles.label}>Description</Text>
      <TextInput style={[sStyles.input, { minHeight: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm(p => ({...p, description: v}))} placeholder="Optional details about this station…" placeholderTextColor="#94a3b8" multiline />

      <View style={sStyles.toggleRow}>
        <Text style={sStyles.label}>Active (visible to customers)</Text>
        <TouchableOpacity style={[sStyles.toggle, form.is_active && sStyles.toggleOn]} onPress={() => setForm(p => ({...p, is_active: !p.is_active}))}>
          <View style={[sStyles.toggleThumb, form.is_active && sStyles.toggleThumbOn]} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[sStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={sStyles.saveBtnText}>{editing ? '✓ Save Changes' : '+ Add Station'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  )

  return (
    <ScrollView style={sStyles.scroll}>
      <View style={sStyles.topRow}>
        <TouchableOpacity style={[sStyles.statBadge, { backgroundColor: stationFilter === 'active' ? '#86efac' : '#dcfce7' }]} onPress={() => setStationFilter(v => v === 'active' ? 'all' : 'active')}>
          <Text style={[sStyles.statBadgeText, { color: '#15803d' }]}>{activeStations.length} Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sStyles.statBadge, { backgroundColor: stationFilter === 'inactive' ? '#fde68a' : '#fef9c3' }]} onPress={() => setStationFilter(v => v === 'inactive' ? 'all' : 'inactive')}>
          <Text style={[sStyles.statBadgeText, { color: '#a16207' }]}>{inactiveStations.length} Inactive</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={sStyles.refreshBtn} onPress={fetchAll}>
          <Text style={sStyles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sStyles.addBtn} onPress={openAdd}>
          <Text style={sStyles.addBtnText}>+ Add Station</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#0f4c8a" style={{ marginTop: 40 }} />
      ) : displayedStations.length === 0 ? (
        <View style={sStyles.empty}>
          <Text style={sStyles.emptyIcon}>💧</Text>
          <Text style={sStyles.emptyText}>No stations yet. Tap + Add Station to create one.</Text>
        </View>
      ) : (
        <View style={sStyles.table}>
          <View style={[sStyles.tableRow, sStyles.tableHeader]}>
            <Text style={[sStyles.col, sStyles.colName, sStyles.headerText]}>STATION</Text>
            <Text style={[sStyles.col, sStyles.colCat,  sStyles.headerText]}>CATEGORY</Text>
            <Text style={[sStyles.col, sStyles.colNum,  sStyles.headerText]}>PRICE</Text>
            <Text style={[sStyles.col, sStyles.colNum,  sStyles.headerText]}>DELIVERY</Text>
            <Text style={[sStyles.col, sStyles.colStat, sStyles.headerText]}>STATUS</Text>
          </View>
          {displayedStations.map(s => {
            const isDeleting   = deletingId === s.id
            const isConfirming = confirmDeleteId === s.id
            const isExpanded   = expandedStationId === s.id
            return (
              <View key={s.id}>
                <TouchableOpacity style={sStyles.tableRow} onPress={() => setExpandedStationId(isExpanded ? null : s.id)} activeOpacity={0.8}>
                  <View style={[sStyles.col, sStyles.colName]}>
                    <Text style={sStyles.stationName}>{s.name}</Text>
                    {s.description ? <Text style={sStyles.stationDesc} numberOfLines={1}>{s.description}</Text> : null}
                  </View>
                  <Text style={[sStyles.col, sStyles.colCat]}>{s.category_name || '—'}</Text>
                  <Text style={[sStyles.col, sStyles.colNum]}>₱{Number(s.price).toLocaleString()}</Text>
                  <Text style={[sStyles.col, sStyles.colNum]}>₱{Number(s.delivery_fee || 0).toLocaleString()}</Text>
                  <View style={[sStyles.col, sStyles.colStat]}>
                    <View style={[sStyles.statusDot, { backgroundColor: s.is_active ? '#22c55e' : '#f59e0b' }]} />
                    <Text style={[sStyles.statusLabel, { color: s.is_active ? '#15803d' : '#a16207' }]}>{s.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={sStyles.expandedRow}>
                    <Text style={sStyles.expandedText}>📦 Stock: <Text style={sStyles.expandedVal}>{s.stock ?? 0} gal</Text></Text>
                    <Text style={sStyles.expandedText}>⏱ ETA: <Text style={sStyles.expandedVal}>{s.eta || '—'}</Text></Text>
                  </View>
                )}

                <View style={sStyles.actionRow}>
                  <TouchableOpacity style={sStyles.editBtn} onPress={() => openEdit(s)}>
                    <Text style={sStyles.editBtnText}>✎ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={sStyles.toggleStatusBtn} onPress={() => handleToggleActive(s)}>
                    <Text style={sStyles.toggleStatusText}>{s.is_active ? '○ Inactive' : '● Active'}</Text>
                  </TouchableOpacity>
                  {isConfirming ? (
                    <View style={sStyles.confirmRow}>
                      <TouchableOpacity style={sStyles.confirmYes} onPress={() => handleDelete(s.id)} disabled={isDeleting}>
                        <Text style={sStyles.confirmYesText}>{isDeleting ? '…' : 'Confirm'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={sStyles.confirmNo} onPress={() => setConfirmDeleteId(null)}>
                        <Text style={sStyles.confirmNoText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={sStyles.deleteBtn} onPress={() => handleDelete(s.id)}>
                      <Text style={sStyles.deleteBtnText}>✕ Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={sStyles.rowDivider} />
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const sStyles = StyleSheet.create({
  scroll:           { flex: 1, backgroundColor: '#f8fafc' },
  topRow:           { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, flexWrap: 'wrap' },
  statBadge:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statBadgeText:    { fontSize: 12, fontWeight: '700' },
  refreshBtn:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  refreshBtnText:   { fontSize: 12, color: '#475569', fontWeight: '600' },
  addBtn:           { backgroundColor: '#0f4c8a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty:            { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:        { fontSize: 44, marginBottom: 10 },
  emptyText:        { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },
  table:            { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 24 },
  tableRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  tableHeader:      { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText:       { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  col:              { fontSize: 13, color: '#374151' },
  colName:          { flex: 2 },
  colCat:           { flex: 1, textAlign: 'center' },
  colNum:           { flex: 1, textAlign: 'center' },
  colStat:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  stationName:      { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  stationDesc:      { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  statusDot:        { width: 7, height: 7, borderRadius: 4 },
  statusLabel:      { fontSize: 11, fontWeight: '600' },
  actionRow:        { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 10 },
  editBtn:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd' },
  editBtnText:      { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  toggleStatusBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047' },
  toggleStatusText: { fontSize: 12, color: '#a16207', fontWeight: '600' },
  deleteBtn:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  deleteBtnText:    { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  confirmRow:       { flexDirection: 'row', gap: 6 },
  confirmYes:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#dc2626' },
  confirmYesText:   { fontSize: 12, color: '#fff', fontWeight: '700' },
  confirmNo:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  confirmNoText:    { fontSize: 12, color: '#64748b', fontWeight: '600' },
  rowDivider:       { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 10 },
  expandedRow:      { flexDirection: 'row', gap: 20, paddingHorizontal: 10, paddingBottom: 8, backgroundColor: '#f8fafc' },
  expandedText:     { fontSize: 12, color: '#64748b' },
  expandedVal:      { fontWeight: '700', color: '#0f172a' },
  tableFooter:      { fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 10 },
  formScroll:       { flex: 1, backgroundColor: '#f8fafc' },
  formHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle:        { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  formClose:        { fontSize: 13, color: '#64748b' },
  label:            { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input:            { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  inputErr:         { borderColor: '#ef4444' },
  errText:          { color: '#ef4444', fontSize: 11, marginTop: 3 },
  pillRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  pillActive:       { backgroundColor: '#0f4c8a', borderColor: '#0f4c8a' },
  pillText:         { fontSize: 13, color: '#64748b' },
  pillTextActive:   { color: '#fff', fontWeight: '700' },
  row:              { flexDirection: 'row', marginTop: 4 },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  toggle:           { width: 46, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0', padding: 2 },
  toggleOn:         { backgroundColor: '#0f4c8a' },
  toggleThumb:      { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn:    { transform: [{ translateX: 20 }] },
  saveBtn:          { backgroundColor: '#0f4c8a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
})

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  denied:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedIcon:     { fontSize: 52, marginBottom: 12 },
  deniedTitle:    { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  deniedSub:      { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' },
  btnBack:        { backgroundColor: '#0f4c8a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  btnBackText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabs:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab:            { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: '#0f4c8a' },
  tabText:        { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  tabTextActive:  { color: '#0f4c8a' },
  scroll:         { flex: 1 },
  adminInfo:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  adminTitle:     { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  adminSub:       { fontSize: 13, color: '#64748b', marginTop: 2 },
  adminName:      { fontWeight: '700', color: '#0f4c8a' },
  statsRow:       { marginVertical: 12 },
  statCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statNum:        { fontSize: 24, fontWeight: '800' },
  statLabel:      { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
  summaryRow:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryItem:    { alignItems: 'center', flex: 1 },
  summaryNum:     { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  summaryLabel:   { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  refreshBtn:     { backgroundColor: '#0f4c8a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  refreshBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBanner:    { margin: 16, backgroundColor: '#fee2e2', borderRadius: 10, padding: 12 },
  errorText:      { color: '#dc2626', fontSize: 13 },
  empty:          { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:      { fontSize: 44, marginBottom: 10 },
  emptyText:      { fontSize: 15, color: '#94a3b8' },
  orderList:      { paddingHorizontal: 16, paddingBottom: 24 },
  orderCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1 },
  orderId:        { fontSize: 15, fontWeight: '800', color: '#0f4c8a' },
  orderCustomer:  { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginLeft: 8 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  cardMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  metaItem:       { fontSize: 12, color: '#475569' },
  expanded:       { marginTop: 10 },
  expandDivider:  { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  expandNote:     { fontSize: 13, color: '#374151', marginBottom: 4 },
  expandAddr:     { fontSize: 12, color: '#64748b', marginBottom: 10 },
  itemsBreakdown: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10 },
  itemRow:        { fontSize: 12, color: '#475569', marginBottom: 2 },
  actionRow:      { marginTop: 4 },
  actionLabel:    { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  actionBtns:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  actionBtnText:  { fontSize: 13, fontWeight: '700' },
  closedNote:     { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  expandHint:     { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  listFooter:     { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingBottom: 8 },
})
