'use client'
import { useAuth } from './context/AuthContext'
import LandingPage from './components/landingPage' // Move your current landing code here
import PlayerDashboard from './components/PlayerDashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>

  // If logged in, show the personalized stats dashboard
  if (user) {
    return <PlayerDashboard />
  }

  // If logged out, show the public marketing page
  return <LandingPage />
}