import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function Stars({ value = 0, interactive = false, onChange, size = 20 }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => interactive && onChange?.(n)}
          disabled={!interactive}
        >
          <Text style={[styles.star, { fontSize: size }, n <= value && styles.filled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    color: '#cbd5e1',
  },
  filled: {
    color: '#f59e0b',
  },
})
