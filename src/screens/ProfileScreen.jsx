import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  StyleSheet, ScrollView, Modal, Image, Alert, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import apiClient from '../api/client'
import Stars from '../components/Stars'

const AVATAR_SEEDS = ['initials', 'Ocean', 'River', 'Rain', 'Wave', 'Bubble']

export default function ProfileScreen({ navigate }) {
  const { user, logout } = useAuth()
  const { orders } = useOrders()

  const [isEditing, setIsEditing] = useState(false)
  const [accountData, setAccountData] = useState({ name: '', phone: '', email: '', paymentMethod: 'COD', is_staff: false, points: 0 })
  const [tempIndex, setTempIndex] = useState(0)
  const [savedAvatar, setSavedAvatar] = useState({ type: 'initials', seed: '' })
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [showPassModal, setShowPassModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAppReviewModal, setShowAppReviewModal] = useState(false)
  const [passData, setPassData] = useState({ current_password: '', new_password: '', re_new_password: '' })
  const [addresses, setAddresses] = useState([])
  const [newAddress, setNewAddress] = useState('')
  const [ratings, setRatings] = useState({ app: 0 })
  const [settings, setSettings] = useState({ sms: true, email: true })
  const [loading, setLoading] = useState(true)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const updateLocalState = (data) => {
    setAccountData({
      name: data.user_details?.username || '',
      phone: data.phone || '',
      email: data.user_details?.email || '',
      paymentMethod: data.payment_method || 'COD',
      is_staff: data.user_details?.is_staff || false,
      points: data.points || 0,
    })
    setAddresses(data.addresses || [])
    const loadedType = data.avatar_type || 'initials'
    const loadedSeed = data.avatar_seed || ''
    setSavedAvatar({ type: loadedType, seed: loadedSeed })
    const startIdx = loadedType === 'initials' ? 0 : AVATAR_SEEDS.indexOf(loadedSeed)
    setTempIndex(startIdx === -1 ? 0 : startIdx)
    setRatings({ app: data.app_rating || 0 })
    setSettings({ sms: data.sms_notifications ?? true, email: data.email_notifications ?? true })
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/users/profiles/me/')
        updateLocalState(res.data)
      } catch {}
      finally { setLoading(false) }
    }
    fetchProfile()
  }, [])

  const avatarUri = AVATAR_SEEDS[tempIndex] === 'initials'
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${accountData.name}&backgroundColor=125e98`
    : `https://api.dicebear.com/7.x/lorelei/svg?seed=${AVATAR_SEEDS[tempIndex]}&backgroundColor=e0f2fe`

  const hasChanged = (AVATAR_SEEDS[tempIndex] !== savedAvatar.seed) &&
    !(AVATAR_SEEDS[tempIndex] === 'initials' && savedAvatar.type === 'initials')

  const handleConfirmAvatar = async () => {
    setIsSavingAvatar(true)
    const selectedSeed = AVATAR_SEEDS[tempIndex]
    const newType = selectedSeed === 'initials' ? 'initials' : 'lorelei'
    const newSeed = selectedSeed === 'initials' ? '' : selectedSeed
    try {
      await apiClient.patch('/users/profiles/me/', { avatar_type: newType, avatar_seed: newSeed })
      setSavedAvatar({ type: newType, seed: newSeed })
      Alert.alert('Success', 'Avatar updated!')
    } catch { Alert.alert('Error', 'Failed to save avatar.') }
    finally { setIsSavingAvatar(false) }
  }

  const handleSaveAccount = async () => {
    try {
      await apiClient.patch('/users/profiles/me/', {
        name: accountData.name, email: accountData.email,
        phone: accountData.phone, payment_method: accountData.paymentMethod,
      })
      setIsEditing(false)
      Alert.alert('Success', 'Account information saved!')
    } catch { Alert.alert('Error', 'Failed to save account info.') }
  }

  const handlePasswordChange = async () => {
    if (passData.new_password !== passData.re_new_password) {
      Alert.alert('Error', 'New passwords do not match!'); return
    }
    try {
      await apiClient.post('/auth/users/set_password/', {
        current_password: passData.current_password,
        new_password: passData.new_password,
      })
      Alert.alert('Success', 'Password updated!')
      setShowPassModal(false)
      setPassData({ current_password: '', new_password: '', re_new_password: '' })
    } catch (err) {
      Alert.alert('Error', err.response?.data?.current_password || 'Failed to update password.')
    }
  }

  const handleToggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    try { await apiClient.patch('/users/profiles/me/', { sms_notifications: newSettings.sms, email_notifications: newSettings.email }) }
    catch {}
  }

  const handleAddAddress = async () => {
    if (!newAddress.trim()) return
    if (addresses.length >= 3) { Alert.alert('Limit reached', 'You can only have 3 addresses.'); return }
    try {
      await apiClient.post('/users/profiles/add_address/', { address_text: newAddress, is_default: addresses.length === 0 })
      const res = await apiClient.get('/users/profiles/me/')
      setAddresses(res.data.addresses)
      setNewAddress('')
    } catch { Alert.alert('Error', 'Failed to add address.') }
  }

  const handleRemoveAddress = (addressId) => {
    Alert.alert('Remove Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/users/profiles/remove_address/${addressId}/`)
          const res = await apiClient.get('/users/profiles/me/')
          setAddresses(res.data.addresses)
        } catch { Alert.alert('Error', 'Failed to remove address.') }
      }}
    ])
  }

  const handleSetDefaultAddress = async (id) => {
    try {
      await apiClient.patch(`/users/profiles/set_default_address/${id}/`)
      const res = await apiClient.get('/users/profiles/me/')
      setAddresses(res.data.addresses)
    } catch { Alert.alert('Error', 'Failed to set default address.') }
  }

  const handleDeactivate = async () => {
    if (!confirmDeactivate) { setConfirmDeactivate(true); return }
    setDeactivating(true)
    try {
      await apiClient.post('/users/profiles/deactivate/')
      logout(); navigate('welcome')
    } catch {
      setConfirmDeactivate(false)
    } finally { setDeactivating(false) }
  }

  const handleSaveAppRating = async (ratingVal) => {
    try {
      await apiClient.patch('/users/profiles/me/', { app_rating: ratingVal })
      setRatings({ app: ratingVal })
      setShowAppReviewModal(false)
      Alert.alert('Thanks!', ratings.app === 0 ? 'You earned 1.0 points for your first app review!' : 'Rating updated!')
    } catch {}
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f4c8a" /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar section */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={() => setTempIndex((tempIndex - 1 + AVATAR_SEEDS.length) % AVATAR_SEEDS.length)}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          <TouchableOpacity onPress={() => setTempIndex((tempIndex + 1) % AVATAR_SEEDS.length)}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
        {hasChanged && (
          <TouchableOpacity style={[styles.btnSmall, isSavingAvatar && styles.btnDisabled]} onPress={handleConfirmAvatar} disabled={isSavingAvatar}>
            <Text style={styles.btnSmallText}>{isSavingAvatar ? 'Saving...' : 'Choose Avatar'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.profileName}>{accountData.name || 'User'}</Text>
        {accountData.is_staff && <Text style={styles.adminBadge}>Admin</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{orders ? orders.length : 0}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{(accountData.points || 0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigate('history')}>
          <Text style={styles.menuItemText}>📜 Order History</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAppReviewModal(true)}>
          <Text style={styles.menuItemText}>{ratings.app > 0 ? '✅ Update App Review' : '📱 Review App'}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowHelpModal(true)}>
          <Text style={styles.menuItemText}>❓ Help Centre</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Account Info */}
      <Text style={styles.sectionTitle}>Account Information</Text>
      <View style={styles.infoCard}>
        {[
          { key: 'name',  label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email', keyboard: 'email-address' },
        ].map(f => (
          <View key={f.key} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{f.label}</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={accountData[f.key]}
                onChangeText={v => setAccountData(a => ({ ...a, [f.key]: v }))}
                keyboardType={f.keyboard || 'default'}
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.infoVal}>{accountData[f.key] || 'Not provided'}</Text>
            )}
          </View>
        ))}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment</Text>
          {isEditing ? (
            <View style={styles.paymentRow}>
              {['COD', 'GCash', 'Maya'].map(pm => (
                <TouchableOpacity
                  key={pm}
                  style={[styles.pmPill, accountData.paymentMethod === pm && styles.pmPillOn]}
                  onPress={() => setAccountData(a => ({ ...a, paymentMethod: pm }))}
                >
                  <Text style={[styles.pmPillText, accountData.paymentMethod === pm && styles.pmPillTextOn]}>{pm}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.infoVal}>{accountData.paymentMethod}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.btnPrimary, { marginTop: 12, alignSelf: 'flex-end' }]}
          onPress={isEditing ? handleSaveAccount : () => setIsEditing(true)}
        >
          <Text style={styles.btnPrimaryText}>{isEditing ? 'Save Changes' : 'Edit Account'}</Text>
        </TouchableOpacity>
      </View>

      {/* Addresses */}
      <Text style={styles.sectionTitle}>Addresses</Text>
      <View style={styles.infoCard}>
        {addresses.length < 3 ? (
          <View style={styles.addAddrRow}>
            <TextInput
              style={[styles.infoInput, { flex: 1 }]}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Enter new address..."
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={styles.btnSmall} onPress={handleAddAddress}>
              <Text style={styles.btnSmallText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.addrLimit}>Address limit reached (3/3). Remove one to add a new location.</Text>
        )}
        {addresses.map(addr => (
          <View key={addr.id} style={[styles.addrPill, addr.is_default && styles.addrPillDefault]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrText}>{addr.address_text || addr.text}</Text>
              {addr.is_default && <Text style={styles.defaultBadge}>Default</Text>}
            </View>
            <View style={styles.addrActions}>
              {!addr.is_default && (
                <TouchableOpacity onPress={() => handleSetDefaultAddress(addr.id)}>
                  <Text style={styles.setDefaultBtn}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleRemoveAddress(addr.id)}>
                <Text style={styles.removeBtn}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.infoCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>SMS Notifications</Text>
          <Switch value={settings.sms} onValueChange={() => handleToggleSetting('sms')} trackColor={{ true: '#0f4c8a' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Email Notifications</Text>
          <Switch value={settings.email} onValueChange={() => handleToggleSetting('email')} trackColor={{ true: '#0f4c8a' }} />
        </View>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPassModal(true)}>
          <Text style={styles.menuItemText}>Change Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {confirmDeactivate ? (
          <View style={styles.deactivateConfirm}>
            <Text style={styles.deactivateWarning}>⚠️ This will permanently delete your account. Are you sure?</Text>
            <View style={styles.deactivateBtns}>
              <TouchableOpacity
                style={styles.deactivateCancelBtn}
                onPress={() => setConfirmDeactivate(false)}
                disabled={deactivating}
              >
                <Text style={styles.deactivateCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deactivateConfirmBtn}
                onPress={handleDeactivate}
                disabled={deactivating}
              >
                <Text style={styles.deactivateConfirmText}>
                  {deactivating ? 'Deleting…' : 'Yes, Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleDeactivate}>
            <Text style={[styles.menuItemText, { color: '#dc2626' }]}>Deactivate Account</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Password Modal ── */}
      <Modal visible={showPassModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            {[
              { key: 'current_password', placeholder: 'Current Password' },
              { key: 'new_password',     placeholder: 'New Password' },
              { key: 're_new_password',  placeholder: 'Confirm New Password' },
            ].map(f => (
              <TextInput
                key={f.key}
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={passData[f.key]}
                onChangeText={v => setPassData(p => ({ ...p, [f.key]: v }))}
              />
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowPassModal(false)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handlePasswordChange}>
                <Text style={styles.btnPrimaryText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Help Modal ── */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>❓ Help Centre</Text>
            <Text style={styles.helpText}><Text style={{ fontWeight: '700' }}>Email:</Text> support@refillonwheels.com</Text>
            <Text style={styles.helpText}><Text style={{ fontWeight: '700' }}>Call:</Text> (088) 123-4567</Text>
            <Text style={[styles.modalTitle, { fontSize: 15, marginTop: 16 }]}>FAQs</Text>
            <Text style={styles.helpText}><Text style={{ fontWeight: '700' }}>Q: Delivery time?</Text>{'\n'}A: Most orders within 45–60 minutes.</Text>
            <Text style={styles.helpText}><Text style={{ fontWeight: '700' }}>Q: Change default address?</Text>{'\n'}A: Yes, in the Addresses section above.</Text>
            <Text style={styles.helpText}><Text style={{ fontWeight: '700' }}>Q: How are points calculated?</Text>{'\n'}A: Based on total orders delivered.</Text>
            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => setShowHelpModal(false)}>
              <Text style={styles.btnPrimaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── App Review Modal ── */}
      <Modal visible={showAppReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>Rate Our App</Text>
            <Text style={styles.helpText}>Let us know how we're doing!</Text>
            <Stars value={ratings.app} interactive size={36} onChange={handleSaveAppRating} />
            <TouchableOpacity style={[styles.btnGhost, { marginTop: 16 }]} onPress={() => setShowAppReviewModal(false)}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarCard: {
    backgroundColor: '#0f4c8a', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  arrow: { fontSize: 36, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },
  avatarImg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff' },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
  adminBadge: {
    backgroundColor: '#f59e0b', color: '#fff', paddingHorizontal: 10, paddingVertical: 2,
    borderRadius: 10, fontSize: 12, fontWeight: '700', marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, justifyContent: 'space-around',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800', color: '#0f4c8a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  menuItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  chevron: { fontSize: 18, color: '#94a3b8' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8, marginTop: 4 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  infoVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  infoInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#0f172a', minWidth: 140 },
  paymentRow: { flexDirection: 'row', gap: 6 },
  pmPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  pmPillOn: { backgroundColor: '#0f4c8a', borderColor: '#0f4c8a' },
  pmPillText: { fontSize: 12, color: '#64748b' },
  pmPillTextOn: { color: '#fff', fontWeight: '700' },
  addAddrRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  addrLimit: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  addrPill: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  addrPillDefault: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  addrText: { fontSize: 13, color: '#334155' },
  defaultBadge: { fontSize: 10, color: '#0f4c8a', fontWeight: '700', marginTop: 2 },
  addrActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  setDefaultBtn: { fontSize: 12, color: '#0f4c8a', fontWeight: '600' },
  removeBtn: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingLabel: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dangerItem: { borderBottomWidth: 0 },
  deactivateConfirm:    { padding: 14, backgroundColor: '#fff5f5', borderRadius: 10, margin: 4, borderWidth: 1, borderColor: '#fca5a5' },
  deactivateWarning:    { fontSize: 13, color: '#dc2626', marginBottom: 10 },
  deactivateBtns:       { flexDirection: 'row', gap: 8 },
  deactivateCancelBtn:  { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  deactivateCancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  deactivateConfirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center' },
  deactivateConfirmText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  helpText: { fontSize: 13, color: '#475569', marginBottom: 10, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnPrimary: { backgroundColor: '#0f4c8a', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: '#0f4c8a', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  btnGhostText: { color: '#0f4c8a', fontSize: 14, fontWeight: '700' },
  btnSmall: { backgroundColor: '#0f4c8a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  btnSmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
})
