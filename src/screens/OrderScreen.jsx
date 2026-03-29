import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useOrders } from '../context/OrdersContext'
import { ordersAPI } from '../api/orders'

const fmt = (n) => `₱${Number(n).toLocaleString()}`
const STEPS = ['Configure', 'Review', 'Confirm']

export default function OrderScreen({ navigate, station }) {
  const { createOrder } = useOrders()
  const [qty,      setQty]      = useState(1)
  const [address,  setAddress]  = useState('Carmen, Cagayan de Oro City')
  const [type,     setType]     = useState(station?.waterTypes?.[0] || 'Purified')
  const [step,     setStep]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [orderId,  setOrderId]  = useState(null)
  const [noteText, setNoteText] = useState('')
  const [errors,   setErrors]   = useState({})

  if (!station) return (
    <View style={styles.noStation}>
      <Text style={styles.noStationIcon}>💧</Text>
      <Text style={styles.noStationText}>No station selected.</Text>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('browse')}>
        <Text style={styles.btnPrimaryText}>Browse Stations</Text>
      </TouchableOpacity>
    </View>
  )

  const subtotal = qty * station.pricePerGallon
  const total    = subtotal + (station.deliveryFee || 0)

  const validate = () => {
    const e = {}
    if (!address.trim())                 e.address = 'Delivery address is required.'
    else if (address.trim().length < 10) e.address = 'Please enter a complete address (at least 10 chars).'
    if (qty < 1)                         e.qty     = 'Quantity must be at least 1.'
    if (noteText.length > 1000)          e.note    = 'Note cannot exceed 1000 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = async () => {
    setLoading(true); setErrors({})
    const result = await createOrder({
      shipping_address: address,
      status: 'pending',
      notes: `${qty}x ${type} from ${station.name}`,
    })
    if (!result.success) {
      const e = result.errors || {}
      setErrors({ server: e.shipping_address?.[0] || e.notes?.[0] || e.detail || 'Something went wrong.' })
      setStep(1); setLoading(false); return
    }
    const newOrderId = result.data.id
    try {
      await ordersAPI.items.create(newOrderId, {
        product_id: station.id, quantity: qty, price: station.pricePerGallon,
      })
    } catch {}
    if (noteText.trim()) {
      try { await ordersAPI.notes.create(newOrderId, { content: noteText.trim(), note_type: 'customer' }) }
      catch {}
    }
    setOrderId(newOrderId); setStep(3); setLoading(false)
  }

  // ─── Step 3: Success ───
  if (step === 3) return (
    <ScrollView contentContainerStyle={styles.successPage}>
      <Text style={styles.successOrb}>💧</Text>
      <Text style={styles.successTitle}>Order Placed!</Text>
      <Text style={styles.successSub}>Your water is on its way from{'\n'}<Text style={{ fontWeight: '700' }}>{station.name}</Text></Text>
      {station.eta && station.eta !== '—' && (
        <Text style={styles.successEta}>ETA: <Text style={{ fontWeight: '700' }}>{station.eta}</Text></Text>
      )}
      {orderId && <Text style={styles.orderId}>Order #{orderId}</Text>}
      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24 }]} onPress={() => navigate('track', { orderId })}>
        <Text style={styles.btnPrimaryText}>📍 Track Order</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnGhost, { marginTop: 10 }]} onPress={() => navigate('home')}>
        <Text style={styles.btnGhostText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? navigate('browse') : setStep(step - 1)}>
          <Text style={styles.backText}>← {step === 1 ? 'Back' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place an Order</Text>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => {
          const s = i + 1
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, step === s && styles.stepActive, step > s && styles.stepDone]}>
                <Text style={styles.stepNum}>{step > s ? '✓' : s}</Text>
              </View>
              <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>{label}</Text>
            </View>
          )
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Station pill */}
        <View style={styles.stationPill}>
          <Text style={styles.stationPillIcon}>💧</Text>
          <View>
            <Text style={styles.stationPillName}>{station.name}</Text>
            {station.eta && station.eta !== '—' && <Text style={styles.stationPillMeta}>⏱ {station.eta}</Text>}
          </View>
        </View>

        {/* Step 1 */}
        {step === 1 && <>
          {errors.server && <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {errors.server}</Text></View>}

          <Text style={styles.fieldLabel}>Water Type</Text>
          <View style={styles.pillRow}>
            {(station.waterTypes || ['Purified']).map(t => (
              <TouchableOpacity key={t} style={[styles.typePill, type === t && styles.typePillOn]} onPress={() => setType(t)}>
                <Text style={[styles.typePillText, type === t && styles.typePillTextOn]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Number of Gallons</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => q + 1)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {errors.qty && <Text style={styles.errText}>{errors.qty}</Text>}

          <Text style={styles.fieldLabel}>Delivery Address</Text>
          <TextInput
            style={[styles.input, errors.address && styles.inputErr]}
            value={address}
            onChangeText={t => { setAddress(t); if (errors.address) setErrors(p => ({ ...p, address: null })) }}
            placeholder="Enter your full delivery address"
            placeholderTextColor="#94a3b8"
            multiline
          />
          {errors.address && <Text style={styles.errText}>{errors.address}</Text>}

          <Text style={styles.fieldLabel}>Delivery Note <Text style={styles.optLabel}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.note && styles.inputErr]}
            value={noteText}
            onChangeText={t => { setNoteText(t); if (errors.note) setErrors(p => ({ ...p, note: null })) }}
            placeholder="e.g. Leave at the gate, call on arrival…"
            placeholderTextColor="#94a3b8"
            multiline numberOfLines={3} maxLength={1000}
          />
          <Text style={[styles.charCount, noteText.length > 900 && styles.charWarn]}>{noteText.length} / 1000</Text>

          <View style={styles.footer}>
            <View>
              <Text style={styles.totalLabel}>Order Total</Text>
              <Text style={styles.totalVal}>{fmt(total)}</Text>
              <Text style={styles.totalBreak}>{qty} gal × {fmt(station.pricePerGallon)}</Text>
              {station.deliveryFee > 0 && <Text style={styles.totalBreak}>Delivery: {fmt(station.deliveryFee)}</Text>}
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { if (validate()) setStep(2) }}>
              <Text style={styles.btnPrimaryText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </>}

        {/* Step 2 */}
        {step === 2 && <>
          <Text style={styles.sectionTitle}>Review Your Order</Text>
          {[
            ['Station',    station.name],
            ['Water Type', type],
            ['Quantity',   `${qty} gallon${qty > 1 ? 's' : ''}`],
            ['Total',      fmt(total)],
            ['Address',    address],
            ...(station.eta && station.eta !== '—' ? [['ETA', station.eta]] : []),
          ].map(([label, val]) => (
            <View key={label} style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{label}</Text>
              <Text style={styles.reviewVal}>{val}</Text>
            </View>
          ))}
          {noteText.trim() && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>📝 Note</Text>
              <Text style={styles.reviewVal}>"{noteText}"</Text>
            </View>
          )}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setStep(1)}>
              <Text style={styles.btnGhostText}>← Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Confirm Order ✓</Text>}
            </TouchableOpacity>
          </View>
        </>}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#0f4c8a', flexDirection: 'row',
    alignItems: 'center', padding: 16, gap: 12,
  },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  stepRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 24,
    backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center',
  },
  stepActive: { backgroundColor: '#0f4c8a' },
  stepDone: { backgroundColor: '#22c55e' },
  stepNum: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepLabel: { fontSize: 11, color: '#94a3b8' },
  stepLabelActive: { color: '#0f4c8a', fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  stationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginBottom: 20,
  },
  stationPillIcon: { fontSize: 24 },
  stationPillName: { fontSize: 14, fontWeight: '700', color: '#0f4c8a' },
  stationPillMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  optLabel: { fontWeight: '400', color: '#94a3b8' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  typePillOn: { backgroundColor: '#0f4c8a', borderColor: '#0f4c8a' },
  typePillText: { fontSize: 13, color: '#64748b' },
  typePillTextOn: { color: '#fff', fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 4 },
  qtyBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f4c8a',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  qtyVal: { fontSize: 22, fontWeight: '700', color: '#0f172a', minWidth: 32, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: '#0f172a', backgroundColor: '#fff',
  },
  inputErr: { borderColor: '#ef4444' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  charWarn: { color: '#f59e0b' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  totalLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  totalVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  totalBreak: { fontSize: 12, color: '#94a3b8' },
  btnPrimary: { backgroundColor: '#0f4c8a', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  btnGhostText: { color: '#0f4c8a', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  reviewLabel: { fontSize: 13, color: '#64748b' },
  reviewVal: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'right' },
  noStation: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  noStationIcon: { fontSize: 56, marginBottom: 12 },
  noStationText: { fontSize: 15, color: '#64748b', marginBottom: 20 },
  successPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successOrb: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  successSub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  successEta: { fontSize: 14, color: '#64748b' },
  orderId: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
})
