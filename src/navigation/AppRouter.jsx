import { useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '../context/AuthContext'

import WelcomeScreen   from '../screens/WelcomeScreen'
import LoginScreen     from '../screens/LoginScreen'
import RegisterScreen  from '../screens/RegisterScreen'
import AppShell        from '../components/AppShell'
import HomeScreen      from '../screens/HomeScreen'
import BrowseScreen    from '../screens/BrowseScreen'
import HistoryScreen   from '../screens/HistoryScreen'
import TrackScreen     from '../screens/TrackScreen'
import ProfileScreen   from '../screens/ProfileScreen'
import OrderScreen     from '../screens/OrderScreen'
import ScheduleScreen  from '../screens/ScheduleScreen'

import AdminScreen    from '../screens/AdminScreen'
 
const SHELL_PAGES = ['home', 'browse', 'history', 'track', 'profile', 'admin']

export default function AppRouter() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('welcome')
  const [pageProps, setPageProps] = useState({})

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f4c8a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  const navigate = (to, props = {}) => {
    setPageProps(props)
    setPage(to)
  }

  if (!user) {
    if (page === 'login')    return <LoginScreen    navigate={navigate} />
    if (page === 'register') return <RegisterScreen navigate={navigate} />
    return <WelcomeScreen navigate={navigate} />
  }

  if (SHELL_PAGES.includes(page)) {
    const effectivePage = user?.is_staff && page !== 'admin' ? 'admin' : page
    return (
      <AppShell page={effectivePage} navigate={navigate}>
        {effectivePage === 'home'    && <HomeScreen    navigate={navigate} />}
        {effectivePage === 'browse'  && <BrowseScreen  navigate={navigate} {...pageProps} />}
        {effectivePage === 'history' && <HistoryScreen navigate={navigate} />}
        {effectivePage === 'track'   && <TrackScreen   navigate={navigate} {...pageProps} />}
        {effectivePage === 'profile' && <ProfileScreen navigate={navigate} />}
        {effectivePage === 'admin'   && <AdminScreen   navigate={navigate} />}
      </AppShell>
    )
  }

  if (page === 'order')    return <OrderScreen    navigate={navigate} {...pageProps} />
  if (page === 'schedule') return <ScheduleScreen navigate={navigate} {...pageProps} />

  if (user?.is_staff) {
    return (
      <AppShell page="admin" navigate={navigate}>
        <AdminScreen navigate={navigate} />
      </AppShell>
    )
  }
 
  return (
    <AppShell page="home" navigate={navigate}>
      <HomeScreen navigate={navigate} />
    </AppShell>
  )
}
 