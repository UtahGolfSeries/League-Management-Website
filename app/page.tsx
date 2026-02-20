'use client'
import React from 'react'
import { useAuth } from './context/AuthContext'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading } = useAuth()

  return (
    <div style={styles.container}>
      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroOverlay}>
          <h1 style={styles.heroTitle}>UTAH GOLF SERIES</h1>
          <p style={styles.heroSubtitle}>The Premier Amateur Competition in the Beehive State.</p>
          
          {/* UPDATED: Only show these to logged-out visitors */}
          {!user && !loading && (
            <div style={styles.heroActions}>
              <Link href="/signup" style={styles.primaryBtn}>Join the Series</Link>
              <Link href="/login" style={styles.secondaryBtn}>Sign In</Link>
            </div>
          )}
        </div>
      </section>

      {/* DASHBOARD SECTION (Visible only if logged in) */}
      {user && (
        <section style={styles.dashboardSection}>
          <h2 style={styles.sectionTitle}>Welcome back, {user.display_name}</h2>
          <div style={styles.grid}>
            
            {/* CARD 1: WALLET SNAPSHOT */}
            <Link href="/account" style={styles.card}>
              <h3 style={styles.cardTitle}>My Wallet</h3>
              <p style={styles.cardDetail}>View your tournament winnings and clubhouse credit.</p>
            </Link>

            {/* CARD 2: TOURNAMENTS / SCHEDULE */}
<Link href={user.role === 'admin' ? "/admin/leagues" : "/schedule"} style={styles.card}>
  <h3 style={styles.cardTitle}>{user.role === 'admin' ? 'Manage Rounds' : 'Schedule'}</h3>
  <p style={styles.cardDetail}>
    {user.role === 'admin' 
      ? 'Start new weeks and verify player scores.' 
      : 'View pairings, tee times, and weekly results.'}
  </p>
</Link>

            {/* CARD 3: STANDINGS */}
            <Link href="/standings" style={styles.card}>
              <h3 style={styles.cardTitle}>Leaderboard</h3>
              <p style={styles.cardDetail}>See where you rank against the rest of the field.</p>
            </Link>

          </div>
        </section>
      )}

      {/* PUBLIC INFO SECTION */}
      <section style={styles.infoSection}>
        <div style={styles.infoItem}>
          <h3 style={styles.infoTitle}>Fair Play</h3>
          <p style={styles.infoText}>Net scoring based on verified GHIN handicaps ensures a level playing field for all skill levels.</p>
        </div>
        <div style={styles.infoItem}>
          <h3 style={styles.infoTitle}>Real Stakes</h3>
          <p style={styles.infoText}>Compete for weekly clubhouse credit and the season-long Series Championship.</p>
        </div>
        <div style={styles.infoItem}>
          <h3 style={styles.infoTitle}>Community</h3>
          <p style={styles.infoText}>Connect with local golfers and enjoy the best courses Utah has to offer.</p>
        </div>
      </section>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'sans-serif' },
  
  // HERO STYLES
  hero: {
    height: '60vh',
    background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070&auto=format&fit=crop") center/cover no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    color: '#fff',
    padding: '0 20px'
  },
  heroOverlay: { maxWidth: '800px' },
  heroTitle: { fontSize: '48px', fontWeight: '900' as const, marginBottom: '10px', letterSpacing: '2px' },
  heroSubtitle: { fontSize: '18px', marginBottom: '30px', opacity: 0.9 },
  heroActions: { display: 'flex', gap: '15px', justifyContent: 'center' },
  
  // BUTTONS
  primaryBtn: { background: '#eecb33', color: '#fff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '16px', width: '200pt' },
  secondaryBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '16px', border: '1px solid #fff', width: '200pt' },

  // DASHBOARD STYLES
  dashboardSection: { padding: '60px 20px', maxWidth: '1000px', margin: '0 auto' },
  sectionTitle: { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a', marginBottom: '30px', textAlign: 'center' as const },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  card: { 
    background: '#fff', 
    padding: '30px', 
    borderRadius: '16px', 
    textDecoration: 'none',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
    border: '1px solid #eee',
    textAlign: 'center' as const,
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  cardIcon: { fontSize: '40px', display: 'block', marginBottom: '15px' },
  cardTitle: { color: '#eecb33', fontSize: '18px', fontWeight: 'bold' as const, marginBottom: '10px' },
  cardDetail: { color: '#666', fontSize: '14px', lineHeight: '1.5' },

  // INFO STYLES
  infoSection: { 
    padding: '60px 20px', 
    background: '#f9f9f9', 
    display: 'flex', 
    flexWrap: 'wrap' as const, 
    justifyContent: 'center', 
    gap: '40px',
    borderTop: '1px solid #eee'
  },
  infoItem: { maxWidth: '300px', textAlign: 'center' as const },
  infoTitle: { color: '#1a1a1a', fontSize: '18px', fontWeight: 'bold' as const, marginBottom: '10px' },
  infoText: { color: '#666', fontSize: '14px', lineHeight: '1.6' }
}