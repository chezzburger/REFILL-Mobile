import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, TextInput, ActivityIndicator, Alert
} from 'react-native'
import apiClient from '../api/client'
import Stars from '../components/Stars'

const reviewsAPI = {
  getAll:  (stationId)                 => apiClient.get(`/products/stations/${stationId}/reviews/`),
  create:  (stationId, data)           => apiClient.post(`/products/stations/${stationId}/reviews/`, data),
  update:  (stationId, reviewId, data) => apiClient.patch(`/products/stations/${stationId}/reviews/${reviewId}/`, data),
  delete:  (stationId, reviewId)       => apiClient.delete(`/products/stations/${stationId}/reviews/${reviewId}/`),
}

export default function StationModal({ station, onClose, onOrder, onSchedule }) {
  const [reviews,     setReviews]     = useState([])
  const [loadingRevs, setLoadingRevs] = useState(false)
  const [newRating,   setNewRating]   = useState(0)
  const [newComment,  setNewComment]  = useState('')
  const [addErrors,   setAddErrors]   = useState({})
  const [addBusy,     setAddBusy]     = useState(false)
  const [editId,      setEditId]      = useState(null)
  const [editRating,  setEditRating]  = useState(0)
  const [editComment, setEditComment] = useState('')
  const [editBusy,    setEditBusy]    = useState(false)

  useEffect(() => {
    if (!station?.id) return
    setLoadingRevs(true)
    reviewsAPI.getAll(station.id)
      .then(r => setReviews(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingRevs(false))
  }, [station?.id])

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : station?.rating

  const validate = (rating, comment, setErr) => {
    const e = {}
    if (!rating || rating < 1) e.rating  = 'Please pick a star rating.'
    if (comment.length > 500)  e.comment = 'Comment cannot exceed 500 characters.'
    setErr(e)
    return Object.keys(e).length === 0
  }

  const handleAdd = async () => {
    if (!validate(newRating, newComment, setAddErrors)) return
    setAddBusy(true)
    try {
      const r = await reviewsAPI.create(station.id, { rating: newRating, comment: newComment.trim() })
      setReviews(prev => [r.data, ...prev])
      setNewRating(0); setNewComment(''); setAddErrors({})
    } catch (err) {
      const d = err.response?.data || {}
      setAddErrors({ server: d.detail || d.non_field_errors?.[0] || 'Could not submit review.' })
    } finally { setAddBusy(false) }
  }

  const handleSaveEdit = async () => {
    if (!validate(editRating, editComment, () => {})) return
    setEditBusy(true)
    try {
      const r = await reviewsAPI.update(station.id, editId, { rating: editRating, comment: editComment.trim() })
      setReviews(prev => prev.map(rv => rv.id === editId ? r.data : rv))
      setEditId(null)
    } catch {}
    finally { setEditBusy(false) }
  }

  const handleDelete = (reviewId) => {
    Alert.alert('Delete Review', 'Delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await reviewsAPI.delete(station.id, reviewId)
          setReviews(prev => prev.filter(rv => rv.id !== reviewId))
        } catch { Alert.alert('Error', 'Could not delete review.') }
      }}
    ])
  }

  if (!station) return null

  return (
    <Modal visible={!!station} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stationName}>{station.name}</Text>
              <View style={styles.headerMeta}>
                {station.distance && station.distance !== '—' && (
                  <Text style={styles.metaText}>📍 {station.distance}</Text>
                )}
                <View style={[styles.openBadge, !station.open && styles.closedBadge]}>
                  <Text style={styles.openBadgeText}>{station.open ? '🟢 Open' : '🔴 Closed'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Rating summary */}
            <View style={styles.ratingBlock}>
              <Text style={styles.avgScore}>{avg || '—'}</Text>
              <View>
                <Stars value={Math.round(avg || 0)} size={18} />
                <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              {[
                ['💧 Water Types', station.waterTypes?.join(', ') || '—'],
                ['💰 Per Gallon',  `₱${station.pricePerGallon}`],
                ['🚚 Delivery Fee',`₱${station.deliveryFee}`],
                ['⏱ ETA',          station.eta || '—'],
                ['📍 Location',    'Carmen, Cagayan de Oro City'],
                ['🕐 Hours',       '6:00 AM – 9:00 PM daily'],
              ].map(([label, val]) => (
                <View key={label} style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoVal}>{val}</Text>
                </View>
              ))}
            </View>

            {/* CTA buttons */}
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={[styles.btnPrimary, !station.open && styles.btnDisabled]}
                disabled={!station.open}
                onPress={() => onOrder(station)}
              >
                <Text style={styles.btnPrimaryText}>🛒 Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => onSchedule(station)}>
                <Text style={styles.btnGhostText}>📅 Schedule</Text>
              </TouchableOpacity>
            </View>

            {/* Reviews */}
            <Text style={styles.reviewsTitle}>Customer Reviews</Text>

            {loadingRevs ? (
              <ActivityIndicator color="#0f4c8a" style={{ marginVertical: 12 }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.reviewsEmpty}>No reviews yet. Be the first!</Text>
            ) : (
              reviews.map(rv => (
                <View key={rv.id} style={styles.reviewItem}>
                  {editId === rv.id ? (
                    <View>
                      <Stars value={editRating} interactive onChange={setEditRating} />
                      <TextInput
                        style={styles.noteInput}
                        value={editComment}
                        onChangeText={setEditComment}
                        multiline numberOfLines={3} maxLength={500}
                      />
                      <View style={styles.editBtns}>
                        <TouchableOpacity style={styles.btnGhost} onPress={() => setEditId(null)}>
                          <Text style={styles.btnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveEdit} disabled={editBusy}>
                          <Text style={styles.btnPrimaryText}>{editBusy ? 'Saving…' : 'Save'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.reviewTop}>
                        <View style={styles.authorBlock}>
                          <View style={styles.authorAvatar}>
                            <Text style={styles.authorAvatarText}>{rv.author_username?.[0]?.toUpperCase() || '?'}</Text>
                          </View>
                          <View>
                            <Text style={styles.authorName}>{rv.author_username || 'Anonymous'}</Text>
                            <Text style={styles.reviewDate}>
                              {rv.created_at ? new Date(rv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </Text>
                          </View>
                        </View>
                        <Stars value={rv.rating} size={14} />
                      </View>
                      {rv.comment ? <Text style={styles.reviewComment}>"{rv.comment}"</Text> : null}
                      {rv.is_own && (
                        <View style={styles.reviewActions}>
                          <TouchableOpacity onPress={() => { setEditId(rv.id); setEditRating(rv.rating); setEditComment(rv.comment || '') }}>
                            <Text style={styles.editBtn}>✏️ Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(rv.id)}>
                            <Text style={styles.deleteBtn}>🗑 Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Add review form */}
            <Text style={styles.reviewFormTitle}>Leave a Review</Text>
            <Text style={styles.fieldLabel}>Your Rating</Text>
            <Stars value={newRating} interactive size={28} onChange={v => { setNewRating(v); setAddErrors(p => ({ ...p, rating: null })) }} />
            {addErrors.rating && <Text style={styles.errText}>{addErrors.rating}</Text>}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Comment <Text style={styles.optLabel}>(optional)</Text></Text>
            <TextInput
              style={[styles.noteInput, addErrors.comment && styles.inputErr]}
              value={newComment}
              onChangeText={t => { setNewComment(t); setAddErrors(p => ({ ...p, comment: null })) }}
              placeholder="Water quality? Delivery speed? Friendly driver?"
              placeholderTextColor="#94a3b8"
              multiline numberOfLines={3} maxLength={500}
            />
            <Text style={styles.charCount}>{newComment.length}/500</Text>
            {addErrors.comment && <Text style={styles.errText}>{addErrors.comment}</Text>}
            {addErrors.server  && <Text style={styles.errText}>{addErrors.server}</Text>}

            <TouchableOpacity
              style={[styles.btnPrimary, (addBusy || newRating === 0) && styles.btnDisabled, { marginTop: 12 }]}
              onPress={handleAdd}
              disabled={addBusy || newRating === 0}
            >
              <Text style={styles.btnPrimaryText}>{addBusy ? 'Submitting…' : '⭐ Submit Review'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  stationName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaText: { fontSize: 13, color: '#64748b' },
  openBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  closedBadge: { backgroundColor: '#fee2e2' },
  openBadgeText: { fontSize: 12, fontWeight: '600' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16, paddingBottom: 40 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avgScore: { fontSize: 36, fontWeight: '800', color: '#0f172a' },
  reviewCount: { fontSize: 12, color: '#64748b', marginTop: 4 },
  infoGrid: { marginBottom: 16 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoVal: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'right' },
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  reviewsTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  reviewsEmpty: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  reviewItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  authorBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0f4c8a', justifyContent: 'center', alignItems: 'center' },
  authorAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  authorName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  reviewDate: { fontSize: 11, color: '#94a3b8' },
  reviewComment: { fontSize: 13, color: '#334155', fontStyle: 'italic', marginTop: 4 },
  reviewActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  editBtn: { fontSize: 12, color: '#0f4c8a', fontWeight: '600' },
  deleteBtn: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  editBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reviewFormTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 20, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  optLabel: { fontWeight: '400', color: '#94a3b8' },
  noteInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#0f172a', textAlignVertical: 'top', minHeight: 80, marginTop: 4,
  },
  inputErr: { borderColor: '#ef4444' },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  errText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: '#0f4c8a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnGhostText: { color: '#0f4c8a', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
})
