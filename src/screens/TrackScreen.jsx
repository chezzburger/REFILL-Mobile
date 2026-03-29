import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useOrders } from '../context/OrdersContext'
import { ordersAPI } from '../api/orders'

const STEPS = [
  { id: 'pending',    icon: '📋', label: 'Order Placed',    desc: 'Your order has been received' },
  { id: 'processing', icon: '⚙️',  label: 'Processing',      desc: 'Station is preparing your water' },
  { id: 'shipped',    icon: '🚚', label: 'Out for Delivery', desc: 'Driver is on the way' },
  { id: 'delivered',  icon: '✅', label: 'Delivered',        desc: 'Order successfully delivered' },
]
const STEP_INDEX = { pending: 0, processing: 1, shipped: 2, delivered: 3 }
const CANCELLABLE = ['pending', 'processing']

export default function TrackScreen({ navigate, orderId, order: passedOrder }) {
  const { orders, refreshOrders } = useOrders()
  const [order, setOrder]             = useState(passedOrder || null)
  const [loading, setLoading]         = useState(false)
  const [selectedId, setSelectedId]   = useState(orderId || null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [notes, setNotes]             = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote]         = useState('')
  const [noteError, setNoteError]     = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [savingNote, setSavingNote]   = useState(false)

  const fetchNotes = (id) => {
    setNotesLoading(true)
    ordersAPI.notes.getAll(id)
      .then(r => { const d = r.data; setNotes(Array.isArray(d) ? d : d.results ?? []) })
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false))
  }

  const activeOrders = orders.filter(o =>
    ['pending', 'processing', 'shipped'].includes(o.status?.toLowerCase())
  )

  useEffect(() => {
    if (selectedId) {
      setLoading(true)
      ordersAPI.getById(selectedId)
        .then(r => { setOrder(r.data); fetchNotes(r.data.id) })
        .catch(() => {
          const found = orders.find(o => o.id === selectedId)
          if (found) { setOrder(found); fetchNotes(found.id) }
        })
        .finally(() => setLoading(false))
    } else if (activeOrders.length > 0 && !order) {
      const first = activeOrders[0]
      setOrder(first); setSelectedId(first.id); fetchNotes(first.id)
    }
  }, [selectedId])

  const handleCancelOrder = async () => {
    setCancelling(true); setCancelError(null)
    try {
      await ordersAPI.updateStatus(order.id, 'cancelled')
      setOrder(prev => ({ ...prev, status: 'cancelled' }))
      setConfirmCancel(false)
      if (typeof refreshOrders === 'function') refreshOrders()
    } catch { setCancelError('Failed to cancel order. Please try again.') }
    finally { setCancelling(false) }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    if (newNote.length > 1000) { setNoteError('Note cannot exceed 1000 characters.'); return }
    setSavingNote(true); setNoteError('')
    try {
      await ordersAPI.notes.create(order.id, { content: newNote.trim(), note_type: 'customer' })
      setNewNote(''); fetchNotes(order.id)
    } catch { setNoteError('Failed to save note. Please try again.') }
    finally { setSavingNote(false) }
  }

  const handleSaveEdit = async () => {
    if (!editingNote.content.trim()) return
    setSavingNote(true)
    try {
      await ordersAPI.notes.update(order.id, editingNote.id, { content: editingNote.content.trim() })
      setEditingNote(null); fetchNotes(order.id)
    } catch {}
    finally { setSavingNote(false) }
  }

  const handleDeleteNote = async (noteId) => {
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await ordersAPI.notes.delete(order.id, noteId); fetchNotes(order.id) } catch {}
      }}
    ])
  }

  const currentStep   = STEP_INDEX[order?.status?.toLowerCase()] ?? 0
  const isCancelled   = order?.status?.toLowerCase() === 'cancelled'
  const isCancellable = CANCELLABLE.includes(order?.status?.toLowerCase())
  const displayTotal  = order?.total_price ?? 0
  const displayQty    = order?.items?.length > 0
    ? order.items.reduce((s, i) => s + (i.quantity ?? 0), 0)
    : (order?.qty ?? '—')

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f4c8a" /></View>

  if (!order) return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyText}>No active orders to track.</Text>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('browse')}>
        <Text style={styles.btnPrimaryText}>Place an Order</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order selector */}
      {activeOrders.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {activeOrders.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.orderPill, selectedId === o.id && styles.orderPillActive]}
              onPress={() => { setSelectedId(o.id); setOrder(o); setConfirmCancel(false) }}
            >
              <Text style={[styles.orderPillText, selectedId === o.id && styles.orderPillTextActive]}>
                #{o.id}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Order info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoOrderId}>Order #{order.id}</Text>
        <Text style={styles.infoDetail}>{order.station || order.notes || order.shipping_address || '—'}</Text>
        <View style={styles.infoMeta}>
          <Text style={styles.infoMetaItem}>📅 {order.date || order.created_at?.slice(0, 10) || '—'}</Text>
          <Text style={styles.infoMetaItem}>💧 {displayQty !== '—' ? `${displayQty} gal` : '—'}</Text>
          <Text style={styles.infoMetaItem}>₱{Number(displayTotal).toLocaleString()}</Text>
        </View>
      </View>

      {isCancelled ? (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledIcon}>❌</Text>
          <Text style={styles.cancelledText}>This order was cancelled.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('browse')}>
            <Text style={styles.btnPrimaryText}>Place New Order</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${(currentStep / (STEPS.length - 1)) * 100}%` }]} />
            </View>
          </View>

          {/* Steps */}
          {STEPS.map((s, i) => {
            const done = i < currentStep
            const curr = i === currentStep
            return (
              <View key={s.id} style={styles.stepRow}>
                <View style={styles.stepIconWrap}>
                  <View style={[styles.stepCircle, done && styles.stepDone, curr && styles.stepCurr]}>
                    <Text style={styles.stepEmoji}>{s.icon}</Text>
                  </View>
                  {i < STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, curr && styles.stepLabelCurr]}>{s.label}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                  {curr && <View style={styles.nowBadge}><Text style={styles.nowText}>Now</Text></View>}
                </View>
              </View>
            )
          })}

          {order.status?.toLowerCase() !== 'delivered' && (
            <View style={styles.etaCard}>
              <Text style={styles.etaIcon}>⏱</Text>
              <View>
                <Text style={styles.etaLabel}>Estimated Arrival</Text>
                <Text style={styles.etaVal}>15–25 minutes</Text>
              </View>
            </View>
          )}

          {order.status?.toLowerCase() === 'delivered' && (
            <View style={styles.deliveredBanner}>
              <Text style={styles.deliveredText}>✅ Delivered! Enjoy your fresh water.</Text>
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 12 }]} onPress={() => navigate('browse')}>
                <Text style={styles.btnPrimaryText}>Order Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCancellable && (
            <View style={styles.cancelWrap}>
              {!confirmCancel ? (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setConfirmCancel(true); setCancelError(null) }}>
                  <Text style={styles.cancelBtnText}>Cancel Order</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cancelConfirm}>
                  <Text style={styles.cancelQ}>Are you sure you want to cancel this order?</Text>
                  {cancelError && <Text style={styles.cancelErr}>{cancelError}</Text>}
                  <View style={styles.cancelActions}>
                    <TouchableOpacity style={styles.btnDanger} onPress={handleCancelOrder} disabled={cancelling}>
                      <Text style={styles.btnDangerText}>{cancelling ? 'Cancelling…' : 'Yes, Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => { setConfirmCancel(false); setCancelError(null) }}>
                      <Text style={styles.btnGhostText}>Keep Order</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Notes section */}
      <View style={styles.notesSection}>
        <Text style={styles.notesTitle}>📝 Your Notes</Text>

        {notesLoading ? (
          <ActivityIndicator size="small" color="#0f4c8a" style={{ marginVertical: 8 }} />
        ) : notes.length === 0 ? (
          <Text style={styles.notesEmpty}>No notes yet. Add one below.</Text>
        ) : (
          notes.map(note => (
            <View key={note.id} style={styles.noteItem}>
              {editingNote?.id === note.id ? (
                <View>
                  <TextInput
                    style={styles.noteInput}
                    value={editingNote.content}
                    onChangeText={c => setEditingNote(p => ({ ...p, content: c }))}
                    multiline numberOfLines={3} maxLength={1000}
                  />
                  <View style={styles.noteEditBtns}>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => setEditingNote(null)}>
                      <Text style={styles.btnGhostText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveEdit} disabled={savingNote}>
                      <Text style={styles.btnPrimaryText}>{savingNote ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.noteContent}>"{note.content}"</Text>
                  <View style={styles.noteMeta}>
                    <Text style={styles.noteDate}>
                      {note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </Text>
                    <View style={styles.noteActions}>
                      <TouchableOpacity onPress={() => setEditingNote({ id: note.id, content: note.content })}>
                        <Text style={styles.noteActionEdit}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                        <Text style={styles.noteActionDelete}>🗑 Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        <Text style={styles.noteAddLabel}>Add a note</Text>
        <TextInput
          style={[styles.noteInput, noteError && styles.inputErr]}
          placeholder="e.g. Leave at the gate, call before arriving…"
          placeholderTextColor="#94a3b8"
          value={newNote}
          onChangeText={t => { setNewNote(t); if (noteError) setNoteError('') }}
          multiline numberOfLines={2} maxLength={1000}
        />
        <View style={styles.noteFooter}>
          <Text style={[styles.charCount, newNote.length > 900 && styles.charWarn]}>{newNote.length} / 1000</Text>
          {!!noteError && <Text style={styles.errText}>{noteError}</Text>}
          <TouchableOpacity
            style={[styles.btnPrimary, (!newNote.trim() || savingNote) && styles.btnDisabled]}
            onPress={handleAddNote}
            disabled={savingNote || !newNote.trim()}
          >
            <Text style={styles.btnPrimaryText}>{savingNote ? 'Saving…' : '+ Add Note'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  orderPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
  orderPillActive: { backgroundColor: '#0f4c8a' },
  orderPillText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  orderPillTextActive: { color: '#fff' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  infoOrderId: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  infoDetail: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  infoMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoMetaItem: { fontSize: 12, color: '#64748b' },
  cancelledCard: { alignItems: 'center', padding: 24, gap: 12 },
  cancelledIcon: { fontSize: 40 },
  cancelledText: { fontSize: 15, color: '#dc2626', fontWeight: '600' },
  progressWrap: { marginBottom: 16 },
  progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#0f4c8a', borderRadius: 3 },
  stepRow: { flexDirection: 'row', marginBottom: 16 },
  stepIconWrap: { alignItems: 'center', width: 40 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDone: { backgroundColor: '#d1fae5' },
  stepCurr: { backgroundColor: '#dbeafe' },
  stepEmoji: { fontSize: 16 },
  stepLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', minHeight: 16, marginVertical: 2 },
  stepLineDone: { backgroundColor: '#22c55e' },
  stepContent: { flex: 1, paddingLeft: 12, paddingTop: 6 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  stepLabelCurr: { color: '#0f4c8a', fontWeight: '700' },
  stepDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  nowBadge: { backgroundColor: '#0f4c8a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  nowText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  etaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 16,
  },
  etaIcon: { fontSize: 24 },
  etaLabel: { fontSize: 12, color: '#64748b' },
  etaVal: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  deliveredBanner: {
    backgroundColor: '#d1fae5', borderRadius: 10, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  deliveredText: { fontSize: 15, fontWeight: '700', color: '#059669' },
  cancelWrap: { marginBottom: 16 },
  cancelBtn: { borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  cancelConfirm: { backgroundColor: '#fff', borderRadius: 10, padding: 16, gap: 12 },
  cancelQ: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  cancelErr: { color: '#dc2626', fontSize: 12 },
  cancelActions: { flexDirection: 'row', gap: 10 },
  notesSection: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 8 },
  notesTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  notesEmpty: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  noteItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10 },
  noteContent: { fontSize: 14, color: '#334155', fontStyle: 'italic' },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  noteDate: { fontSize: 11, color: '#94a3b8' },
  noteActions: { flexDirection: 'row', gap: 12 },
  noteActionEdit: { fontSize: 12, color: '#0f4c8a', fontWeight: '600' },
  noteActionDelete: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  noteEditBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  noteAddLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  noteInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#0f172a', textAlignVertical: 'top', minHeight: 70,
  },
  inputErr: { borderColor: '#ef4444' },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  charCount: { fontSize: 11, color: '#94a3b8' },
  charWarn: { color: '#f59e0b' },
  errText: { color: '#ef4444', fontSize: 12 },
  btnPrimary: { backgroundColor: '#0f4c8a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#0f4c8a', fontWeight: '700', fontSize: 13 },
  btnDanger: { backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
})
