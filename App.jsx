import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/context/AuthContext'
import { OrdersProvider } from './src/context/OrdersContext'
import { NotificationsProvider } from './src/context/NotificationContext'
import AppRouter from './src/navigation/AppRouter'

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrdersProvider>
          <NotificationsProvider>
            <AppRouter />
          </NotificationsProvider>
        </OrdersProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
