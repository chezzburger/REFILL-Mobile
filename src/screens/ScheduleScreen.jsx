import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Platform
} from 'react-native'
import { useOrders } from '../context/OrdersContext'
import { productsAPI } from '../api/products'
import { ordersAPI } from '../api/orders'

const fmt = (n) => `₱${Number(n).toLocaleString()}`

const FREQUENCIES = [
  { id: 'once',     label: 'One-time',  desc: 'Deliver once on selected date' },
  { id: 'weekly',   label: 'Weekly',    desc: 'Repeat every week' },
  { id: 'biweekly', label: 'Bi-weekly', desc: 'Every 2 weeks' },
  { id: 'monthly',  label: 'Monthly',   desc: 'Repeat every month' },
]

const toStation = (product) => ({
  id:             product.id,
  name:           product.name,
  waterTypes:     product.category ? [product.category] : [],
  pricePerGallon: parseFloat(product.price ?? 0),
  deliveryFee:    0,
  stock:          product.stock ?? 0,
  open:           product.is_active ?? true,
})

export default function ScheduleScreen({ navigate, station: initialStation }) {
  const { createOrder } = useOrders()
  const [station, setStation]                 = useState(initialStation || null)
  const [stations, setStations]               = useState([])
  const [loadingStations, setLoadingStations] = useState(!initialStation)
  const [stationsError, setStationsError]     = useState(null)

  const [form, setForm] = useState({
    date: '', time: '08:00', qty: 1,
    type: initialStation?.waterTypes?.[0] || 'Purified',
    address: 'Carmen, Cagayan de Oro City',
    frequency: 'once',
  })
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [noteText, setNoteText] = useState('')
  const [errors,   setErrors]   = useState({})

  useEffect(() => {
    if (initialStation) return
    const fetchStations = async () => {
      setLoadingStations(true); setStationsError(null)
      try {
        const res  = await productsAPI.getAll({ is_active: true })
        const data = res.data
        const list = Array.isArray(data) ? data : (data.results ?? [])
        setStations(list.map(toStation))
      } catch { setStationsError('Could not load stations. Please try again.') }
      finally { setLoadingStations(false) }
    }
    fetchStations()
  }, [initialStation])

  const today = new Date().toISOString().split('T')[0]

  const validate = () => {
    const e = {}
    if (!form.date)             e.date    = 'Please select a delivery date.'
    else if (form.date < today) e.date    = 'Date cannot be in the past.'
    if (!form.time)             e.time    = 'Please select a delivery time.'
    if (form.qty < 1)           e.qty     = 'Quantity must be at least 1.'
    if (!form.address.trim())   e.address = 'Delivery address is required.'
    else if (form.address.trim().length < 10) e.address = 'Please enter a complete address.'
    if (noteText.length > 1000) e.note    = 'Note cannot exceed 1000 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSchedule = async () => {
    if (!validate()) return
    setLoading(true); setErrors({})
    const result = await createOrder({
      shipping_address: form.address,
      status: 'pending',
      notes: `SCHEDULED ${form.frequency.toUpperCase()} | ${form.date} ${form.time} | ${form.qty}x ${form.type}${station ? ` from ${station.name}` : ''}`,
    })
    if (!result.success) {
      const e = result.errors || {}
      setErrors({ server: e.shipping_address?.[0] || e.notes?.[0] || e.detail || 'Something went wrong.' })
      setLoading(false); return
    }
    const newOrderId = result.data.id
    if (station) {
      try {
        await ordersAPI.items.create(newOrderId, {
          product_id: station.id, quantity: form.qty, price: station.pricePerGallon,
        })
      } catch {}
    }
    if (noteText.trim()) {
      try { await ordersAPI.notes.create(newOrderId, { content: noteText.trim(), note_type: 'customer' }) } catch {}
    }
    setLoading(false); setDone(true)
  }

  const freqLabel = FREQUENCIES.find(f => f.id === form.frequency)?.label.toLowerCase()

  // ─── Done ───
  if (done) return (
    <ScrollView contentContainerStyle={styles.successPage}>
      <Text style={styles.successOrb}>📅</Text>
      <Text style={styles.successTitle}>Delivery Scheduled!</Text>
      <Text style={styles.successSub}>
        Your {freqLabel} delivery is set for{'\n'}
        <Text style={{ fontWeight: '700' }}>{form.date} at {form.time}</Text>
      </Text>
      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24 }]} onPress={() => navigate('history')}>
        <Text style={styles.btnPrimaryText}>View Orders</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnGhost, { marginTop: 10 }]} onPress={() => navigate('home')}>
        <Text style={styles.btnGhostText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  // ─── Station picker ───
  if (!station) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('home')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule a Delivery</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select a Station</Text>
        {loadingStations && <ActivityIndicator color="#0f4c8a" style={{ marginTop: 16 }} />}
        {!loadingStations && stationsError && (
          <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {stationsError}</Text></View>
        )}
        {!loadingStations && !stationsError && stations.map(s => (
          <TouchableOpacity key={s.id} style={styles.stationCard} onPress={() => {
            setStation(s)
            setForm(f => ({ ...f, type: s.waterTypes?.[0] || 'Purified' }))
          }}>
            <Text style={styles.stationName}>{s.name}</Text>
            <Text style={styles.stationPrice}>{fmt(s.pricePerGallon)} / gal</Text>
            <View style={styles.stationBtnWrap}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => {
                setStation(s)
                setForm(f => ({ ...f, type: s.waterTypes?.[0] || 'Purified' }))
              }}>
                <Text style={styles.btnPrimaryText}>📅 Schedule this Station</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  // ─── Schedule form ───
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => initialStation ? navigate('browse') : setStation(null)}>
          <Text style={styles.backText}>← {initialStation ? 'Back' : 'Change Station'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Delivery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stationPill}>
          <Text style={styles.stationPillIcon}>💧</Text>
          <Text style={styles.stationPillName}>{station.name}</Text>
        </View>

        {errors.server && <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {errors.server}</Text></View>}

        {/* Frequency */}
        <Text style={styles.fieldLabel}>Frequency</Text>
        <View style={styles.freqGrid}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.freqBtn, form.frequency === f.id && styles.freqBtnOn]}
              onPress={() => setForm(x => ({ ...x, frequency: f.id }))}
            >
              <Text style={[styles.freqBtnLabel, form.frequency === f.id && styles.freqBtnLabelOn]}>{f.label}</Text>
              <Text style={styles.freqBtnDesc}>{f.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date & Time */}
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={[styles.input, errors.date && styles.inputErr]}
              value={form.date}
              onChangeText={d => { setForm(f => ({ ...f, date: d })); if (errors.date) setErrors(p => ({ ...p, date: null })) }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
            {errors.date && <Text style={styles.errText}>{errors.date}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={[styles.input, errors.time && styles.inputErr]}
              value={form.time}
              onChangeText={t => { setForm(f => ({ ...f, time: t })); if (errors.time) setErrors(p => ({ ...p, time: null })) }}
              placeholder="HH:MM"
              placeholderTextColor="#94a3b8"
            />
            {errors.time && <Text style={styles.errText}>{errors.time}</Text>}
          </View>
        </View>

        {/* Water type */}
        {station.waterTypes?.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Water Type</Text>
            <View style={styles.pillRow}>
              {station.waterTypes.map(t => (
                <TouchableOpacity key={t} style={[styles.typePill, form.type === t && styles.typePillOn]}
                  onPress={() => setForm(x => ({ ...x, type: t }))}>
                  <Text style={[styles.typePillText, form.type === t && styles.typePillTextOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Gallons */}
        <Text style={styles.fieldLabel}>Gallons</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setForm(x => ({ ...x, qty: Math.max(1, x.qty - 1) }))}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyVal}>{form.qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setForm(x => ({ ...x, qty: x.qty + 1 }))}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        {errors.qty && <Text style={styles.errText}>{errors.qty}</Text>}

        {/* Address */}
        <Text style={styles.fieldLabel}>Delivery Address</Text>
        <TextInput
          style={[styles.input, errors.address && styles.inputErr]}
          value={form.address}
          onChangeText={a => { setForm(f => ({ ...f, address: a })); if (errors.address) setErrors(p => ({ ...p, address: null })) }}
          multiline
        />
        {errors.address && <Text style={styles.errText}>{errors.address}</Text>}

        {/* Note */}
        <Text style={styles.fieldLabel}>Delivery Note <Text style={styles.optLabel}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={noteText}
          onChangeText={t => { setNoteText(t); if (errors.note) setErrors(p => ({ ...p, note: null })) }}
          placeholder="e.g. Knock loudly, leave at door…"
          placeholderTextColor="#94a3b8"
          multiline numberOfLines={2} maxLength={1000}
        />
        <Text style={[styles.charCount, noteText.length > 900 && styles.charWarn]}>{noteText.length} / 1000</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Per Delivery</Text>
            <Text style={styles.totalVal}>{fmt((form.qty * (station.pricePerGallon || 0)) + (station.deliveryFee || 0))}</Text>
          </View>
          <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleSchedule} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>📅 Confirm Schedule</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f4c8a', flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  stationCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stationName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  stationPrice: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 10 },
  stationBtnWrap: {},
  stationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  stationPillIcon: { fontSize: 24 },
  stationPillName: { fontSize: 14, fontWeight: '700', color: '#0f4c8a' },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  optLabel: { fontWeight: '400', color: '#94a3b8' },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10,
    backgroundColor: '#f8fafc', width: '48%',
  },
  freqBtnOn: { backgroundColor: '#eff6ff', borderColor: '#0f4c8a' },
  freqBtnLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 2 },
  freqBtnLabelOn: { color: '#0f4c8a' },
  freqBtnDesc: { fontSize: 11, color: '#94a3b8' },
  row2: { flexDirection: 'row', gap: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typePillOn: { backgroundColor: '#0f4c8a', borderColor: '#0f4c8a' },
  typePillText: { fontSize: 13, color: '#64748b' },
  typePillTextOn: { color: '#fff', fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 4 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f4c8a', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  qtyVal: { fontSize: 22, fontWeight: '700', color: '#0f172a', minWidth: 32, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  inputErr: { borderColor: '#ef4444' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  errText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  charWarn: { color: '#f59e0b' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  totalLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  totalVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  btnPrimary: { backgroundColor: '#0f4c8a', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  btnGhostText: { color: '#0f4c8a', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  successPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successOrb: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  successSub: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
})
