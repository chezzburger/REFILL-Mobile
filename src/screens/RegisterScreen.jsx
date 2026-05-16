import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

export default function RegisterScreen({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (val) => setForm(f => ({ ...f, [k]: val }))

  const handleRegister = async () => {
    if (!form.username)                   { setError('Username is required'); return }
    if (!form.email)                      { setError('Email is required'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address'); return }
    if (!form.password)                   { setError('Password is required'); return }
    if (form.password.length < 8)         { setError('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm)   { setError('Passwords do not match'); return }

    setLoading(true); setError('')
    try {
      await apiClient.post('/auth/users/', {
        username: form.username,
        email: form.email,
        password: form.password,
        re_password: form.confirm,
      })
      navigate('login', { message: 'Account created! Check your email to verify before logging in.' })
    } catch (e) {
      const data = e.response?.data
      if (data?.username) setError(`Username: ${data.username[0]}`)
      else if (data?.email)    setError(`Email: ${data.email[0]}`)
      else if (data?.password) setError(`Password: ${data.password[0]}`)
      else setError('Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigate('welcome')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>💧 Refill on Wheels</Text>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Start ordering water today</Text>

          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} placeholder="Choose a username"
              placeholderTextColor="#94a3b8" value={form.username}
              onChangeText={set('username')} autoCapitalize="none" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="your@email.com"
              placeholderTextColor="#94a3b8" value={form.email}
              onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="At least 8 characters"
              placeholderTextColor="#94a3b8" value={form.password}
              onChangeText={set('password')} secureTextEntry />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput style={styles.input} placeholder="Repeat your password"
              placeholderTextColor="#94a3b8" value={form.confirm}
              onChangeText={set('confirm')} secureTextEntry
              returnKeyType="done" onSubmitEditing={handleRegister} />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigate('login')}>
              <Text style={styles.linkText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, padding: 24 },
  backBtn: { marginBottom: 24, marginTop: 8 },
  backText: { color: '#0f4c8a', fontSize: 15 },
  brand: { fontSize: 20, fontWeight: '700', color: '#0f4c8a', marginBottom: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  opt: { fontWeight: '400', color: '#94a3b8' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', backgroundColor: '#fff',
  },
  btnPrimary: {
    backgroundColor: '#0f4c8a', paddingVertical: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { color: '#64748b', fontSize: 14 },
  linkText: { color: '#0f4c8a', fontSize: 14, fontWeight: '600' },
})
 