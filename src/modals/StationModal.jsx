import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView,
} from 'react-native'

export default function StationModal({ station, onClose, onOrder, onSchedule }) {
  if (!station) return null

  return (
    <Modal visible={!!station} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
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
            <View style={styles.infoGrid}>
              {[
                ['💧 Water Types',  station.waterTypes?.join(', ') || '—'],
                ['💰 Per Gallon',   `₱${station.pricePerGallon}`],
                ['🚚 Delivery Fee', `₱${station.deliveryFee}`],
                ['⏱ ETA',           station.eta || '—'],
                ['📍 Location',     'Carmen, Cagayan de Oro City'],
                ['🕐 Hours',        '6:00 AM – 9:00 PM daily'],
              ].map(([label, val]) => (
                <View key={label} style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoVal}>{val}</Text>
                </View>
              ))}
            </View>

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
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:          { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header:         { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  stationName:    { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerMeta:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaText:       { fontSize: 13, color: '#64748b' },
  openBadge:      { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  closedBadge:    { backgroundColor: '#fee2e2' },
  openBadgeText:  { fontSize: 12, fontWeight: '600' },
  closeBtn:       { padding: 4 },
  closeBtnText:   { fontSize: 18, color: '#94a3b8' },
  body:           { padding: 16, paddingBottom: 40 },
  infoGrid:       { marginBottom: 20 },
  infoItem:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel:      { fontSize: 13, color: '#64748b' },
  infoVal:        { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'right' },
  ctaRow:         { flexDirection: 'row', gap: 10 },
  btnPrimary:     { flex: 1, backgroundColor: '#0f4c8a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost:       { flex: 1, borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnGhostText:   { color: '#0f4c8a', fontWeight: '700', fontSize: 14 },
  btnDisabled:    { opacity: 0.5 },
})