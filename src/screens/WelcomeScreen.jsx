import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, StatusBar
} from 'react-native'

export default function WelcomeScreen({ navigate }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>💧</Text>
          <Text style={styles.brandName}>REFILL ON WHEELS</Text>
        </View>

        <Text style={styles.title}>Your Ultimate Water{'\n'}Delivery Solution</Text>
        <Text style={styles.subtitle}>"Order easily, track delivery, and stay hydrated."</Text>

        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('register')}>
            <Text style={styles.btnPrimaryText}>GET STARTED</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnOutline} onPress={() => navigate('login')}>
            <Text style={styles.btnOutlineText}>LOG IN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4c8a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 72,
    marginBottom: 8,
  },
  brandName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 48,
  },
  btnGroup: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#0f4c8a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
