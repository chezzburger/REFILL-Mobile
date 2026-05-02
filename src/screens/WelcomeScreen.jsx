import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, StatusBar
} from 'react-native'

import logo from '../../assets/logo.png';
import waterBg from '../../assets/water-bg.png';

export default function WelcomeScreen({ navigate }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Background Image (The water splash) */}
      <Image source={waterBg} style={styles.background} resizeMode="cover" />
      
      <View style={styles.overlay}>
        {/* LOGO AND BRAND BLOCK */}
        <View style={styles.brandHeader}>
          <Image 
            source={logo} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
          <Text style={styles.brandNameText}>REFILL ON WHEELS</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#0f4c8a', // Fallback color
  },
  background: {
    ...StyleSheet.absoluteFillObject, // Makes the water-bg fill the whole screen
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 76, 138, 0.5)', // Adds a slight blue tint so text is readable
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 100, // Explicit size required for images
    height: 100,
    marginBottom: 12,
  },
  brandNameText: {
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
    color: 'rgba(255,255,255,0.85)',
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
    borderColor: 'rgba(255,255,255,0.7)',
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