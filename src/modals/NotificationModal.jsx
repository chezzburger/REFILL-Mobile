import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native'
import { useNotifications } from '../context/NotificationContext'

const TYPE_CONFIG = {
  order_placed:     { icon: '📋', color: '#d97706', label: 'Order Placed'     },
  order_processing: { icon: '⚙️',  color: '#1d4ed8', label: 'Processing'       },
  order_shipped:    { icon: '🚚', color: '#7c3aed', label: 'Out for Delivery' },
  order_delivered:  { icon: '✅', color: '#059669', label: 'Delivered'         },
  order_cancelled:  { icon: '❌', color: '#dc2626', label: 'Cancelled'         },
}
const DEFAULT_CONFIG = { icon: '🔔', color: '#64748b', label: 'Notification' }

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationModal({ onClose, navigate }) {
  const { notifications, loading, markRead, markAllRead, unreadCount } = useNotifications()

  const handleClick = async (notif) => {
    if (!notif.is_read) await markRead(notif.id)
    onClose()
    if (notif.order_id && ['order_placed','order_processing','order_shipped','order_delivered'].includes(notif.notif_type)) {
      navigate('track', { orderId: notif.order_id })
    } else if (notif.order_id && notif.notif_type === 'order_cancelled') {
      navigate('history')
    }
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <ScrollView style={styles.list}>
          {loading && notifications.length === 0 && (
            <View style={styles.empty}><ActivityIndicator color="#0f4c8a" /></View>
          )}

          {!loading && notifications.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet.</Text>
              <Text style={styles.emptySub}>Order status updates will appear here.</Text>
            </View>
          )}

          {notifications.map(notif => {
            const cfg = TYPE_CONFIG[notif.notif_type] || DEFAULT_CONFIG
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.item, !notif.is_read && styles.itemUnread]}
                onPress={() => handleClick(notif)}
              >
                {!notif.is_read && <View style={styles.unreadDot} />}
                <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
                  <Text style={styles.icon}>{cfg.icon}</Text>
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.message}>{notif.message}</Text>
                  <Text style={styles.time}>{timeAgo(notif.created_at)}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Footer */}
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.footer}
            onPress={() => { onClose(); navigate('history') }}
          >
            <Text style={styles.footerText}>View all orders →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  markAllText: { fontSize: 13, color: '#0f4c8a', fontWeight: '600' },
  closeBtn: { fontSize: 18, color: '#94a3b8' },
  list: { flex: 1 },
  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', position: 'relative',
  },
  itemUnread: { backgroundColor: '#f8fafc' },
  unreadDot: {
    position: 'absolute', left: 4, top: '50%',
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#0f4c8a',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 18 },
  textBlock: { flex: 1 },
  message: { fontSize: 13, color: '#334155', lineHeight: 18 },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  footer: {
    padding: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center',
  },
  footerText: { fontSize: 14, color: '#0f4c8a', fontWeight: '600' },
})
