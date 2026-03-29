import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, ScrollView
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { useNotifications } from '../context/NotificationContext'
import NotificationModal from '../modals/NotificationModal'

const NAV = [
  { id: 'home',    icon: '🏠', label: 'Home'     },
  { id: 'browse',  icon: '🛒', label: 'Browse'   },
  { id: 'history', icon: '📋', label: 'Orders'   },
  { id: 'track',   icon: '📍', label: 'Track'    },
  { id: 'profile', icon: '👤', label: 'Profile'  },
]

export default function AppShell({ page, navigate, children }) {
  const { user, logout } = useAuth()
  const { orders } = useOrders()
  const { unreadCount, fetchNotifications } = useNotifications()
  const [showNotifs, setShowNotifs] = useState(false)

  const handleBell = () => {
    fetchNotifications()
    setShowNotifs(v => !v)
  }

  const handleLogout = async () => {
    await logout()
    navigate('welcome')
  }

  const currentNav = NAV.find(n => n.id === page)

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>{currentNav?.icon} {currentNav?.label}</Text>
          <Text style={styles.pageSub}>Carmen, Cagayan de Oro City</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleBell} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area */}
      <View style={styles.mainArea}>
        {children}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {NAV.map(n => (
          <TouchableOpacity
            key={n.id}
            style={styles.tabItem}
            onPress={() => navigate(n.id)}
          >
            <Text style={styles.tabIcon}>{n.icon}</Text>
            <Text style={[styles.tabLabel, page === n.id && styles.tabLabelActive]}>
              {n.label}
            </Text>
            {page === n.id && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notification Modal */}
      <Modal
        visible={showNotifs}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifs(false)}
      >
        <NotificationModal
          onClose={() => setShowNotifs(false)}
          navigate={(to, props) => { setShowNotifs(false); navigate(to, props) }}
        />
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4c8a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f4c8a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 25,
  },
  headerLeft: {},
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  pageSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mainArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#0f4c8a',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: '#0f4c8a',
    borderRadius: 2,
  },
})
