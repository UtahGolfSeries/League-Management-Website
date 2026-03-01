'use client'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [scrollY, setScrollY] = useState(0)

  // Track scroll position for the "morphing" fade effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Calculate opacity: Fades out as you scroll down the first 600px
  const heroOpacity = Math.max(1 - scrollY / 600, 0)

  return (
    <div style={styles.container}>
      {/* 1. LIQUID FILTER DEFINITION */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="liquid">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="liquid" />
        </filter>
      </svg>

      {/* 2. PARALLAX BACKGROUND LAYER (Pinned) */}
      <div style={styles.parallaxBackground}>
        <div style={styles.blobLayer}>
            <div style={{...styles.blob, top: '5%', left: '15%', width: '450px', height: '450px'}} />
            <div style={{...styles.blob, top: '45%', left: '65%', width: '550px', height: '550px'}} />
            <div style={{...styles.blob, top: '75%', left: '5%', width: '400px', height: '400px'}} />
            <div style={{...styles.blob, top: '15%', left: '85%', width: '350px', height: '350px'}} />
            <div style={{...styles.blob, top: '50%', left: '20%', width: '300px', height: '300px'}} />
        </div>
      </div>

      {/* 3. STICKY HERO SECTION 
          This section stays pinned while the rest of the site slides over it.
      */}
      <div style={styles.stickyWrapper}>
        <section style={{ ...styles.hero, opacity: heroOpacity }}>
          <div style={styles.heroOverlay}>
            <div style={styles.badge}>SYSTEM STATUS: BETA ACCESS</div>
            <h1 style={styles.heroTitle}>
              The Modern Operating System for <span style={styles.strokeText}>Amateur Golf.</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Automated scoring, real-time standings, and seamless clubhouse payouts. 
              Engineered for the elite competitive edge.
            </p>
            
            {!user && !loading && (
              <div style={styles.heroActions}>
                <Link href="/inquire" style={styles.primaryBtn}>Request Access</Link>
                <Link href="/login" style={styles.secondaryBtn}>Explore Platform</Link>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4. DASHBOARD & FEATURES (The Scrollable Content) */}
      <div style={styles.contentWrapper}>
        {user && (
          <section style={styles.dashboardSection}>
            <div style={styles.dashHeader}>
               <h2 style={styles.sectionTitle}>Command Center</h2>
               <p style={styles.dashSub}>Manage your profile and track your progress.</p>
            </div>
            <div style={styles.grid}>
              <Link href="/account" style={styles.card}>
                <div style={styles.iconCircle}>💰</div>
                <h3 style={styles.cardTitle}>My Wallet</h3>
                <p style={styles.cardDetail}>View winnings and available clubhouse credit.</p>
              </Link>
              <Link href={user.role === 'admin' ? "/admin/leagues" : "/schedule"} style={styles.card}>
                <div style={styles.iconCircle}>📅</div>
                <h3 style={styles.cardTitle}>{user.role === 'admin' ? 'Manage Rounds' : 'Schedule'}</h3>
                <p style={styles.cardDetail}>View pairings, tee times, and results.</p>
              </Link>
              <Link href="/standings" style={styles.card}>
                <div style={styles.iconCircle}>🏆</div>
                <h3 style={styles.cardTitle}>Leaderboard</h3>
                <p style={styles.cardDetail}>Real-time rankings across the entire field.</p>
              </Link>
            </div>
          </section>
        )}

        <section style={styles.featureSection}>
          <div style={styles.featureHeader}>
              <h2 style={styles.featureLabel}>PLATFORM FEATURES</h2>
              <h3 style={styles.featureMainTitle}>Professional league management.</h3>
          </div>
          <div style={styles.featureGrid}>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>📊</div>
              <h4 style={styles.infoTitle}>Dynamic Scoring</h4>
              <p style={styles.infoText}>Digital scorecards that update the leaderboard instantly.</p>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>🛡️</div>
              <h4 style={styles.infoTitle}>Verified Handicaps</h4>
              <p style={styles.infoText}>Direct GHIN integration for fair play.</p>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>💳</div>
              <h4 style={styles.infoTitle}>Automated Payouts</h4>
              <p style={styles.infoText}>Winnings deposited to clubhouse accounts.</p>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>📱</div>
              <h4 style={styles.infoTitle}>Mobile First</h4>
              <p style={styles.infoText}>Optimized for high-performance use on the course.</p>
            </div>
          </div>
        </section>

        {!user && (
          <section style={styles.ctaSection}>
              <h2 style={styles.ctaTitle}>Modernize your clubhouse.</h2>
              <Link href="/inquire" style={styles.ctaBtn}>Request Platform Access</Link>
          </section>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'sans-serif' as const, position: 'relative' as const },
  
  // FIXED BACKGROUND LAYER
  parallaxBackground: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#eecb33',
    zIndex: 1,
    overflow: 'hidden' as const
  },
  blobLayer: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    filter: 'url(#liquid)',
  },
  blob: {
    position: 'absolute' as const,
    background: '#000',
    borderRadius: '50%',
    opacity: 0.9,
  },

  // STICKY WRAPPER: This pins the hero text to the screen
  stickyWrapper: {
    height: '100vh',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const // Allows scroll to pass through to sections below
  },

  hero: {
    textAlign: 'center' as const,
    color: '#000',
    padding: '0 20px',
    transition: 'opacity 0.1s ease-out',
    pointerEvents: 'auto' as const
  },
  heroOverlay: { maxWidth: '900px', zIndex: 1},
  badge: { display: 'inline-block', padding: '6px 12px', background: '#000', color: '#eecb33', borderRadius: '50px', fontSize: '11px', fontWeight: '900' as const, marginBottom: '20px', letterSpacing: '1px' },
  heroTitle: { fontSize: '64px', fontWeight: '900' as const, marginBottom: '20px', lineHeight: '1.0', color: '#000' },
  strokeText: { color: 'transparent', WebkitTextStroke: '2px #000' },
  heroSubtitle: { fontSize: '18px', marginBottom: '40px', fontWeight: 'bold' as const, color: '#000', opacity: 0.8, maxWidth: '600px', margin: '0 auto 40px' },
  heroActions: { display: 'flex', gap: '20px', justifyContent: 'center' },
  primaryBtn: { background: '#000', color: '#eecb33', padding: '16px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '18px' },
  secondaryBtn: { background: 'transparent', color: '#000', padding: '16px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '18px', border: '2px solid #000' },

  // CONTENT WRAPPER: This slides OVER the sticky hero
  contentWrapper: {
    position: 'relative' as const,
    zIndex: 20,
    marginTop: '0px'
  },
  dashboardSection: { 
    padding: '100px 20px', 
    maxWidth: '1100px', 
    margin: '0 auto', 
    background: '#fff', 
    borderRadius: '40px 40px 0 0', 
    boxShadow: '0 -20px 40px rgba(0,0,0,0.1)',
    minHeight: '100vh' // Ensures enough space to slide over hero
  },
  dashHeader: { textAlign: 'center' as const, marginBottom: '50px' },
  sectionTitle: { fontSize: '32px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 10px 0' },
  dashSub: { color: '#666', fontSize: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' },
  card: { background: '#fff', padding: '40px', borderRadius: '24px', textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', textAlign: 'center' as const },
  iconCircle: { width: '60px', height: '60px', background: '#f9f9f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '30px' },
  cardTitle: { color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold' as const, marginBottom: '12px' },
  cardDetail: { color: '#666', fontSize: '15px', lineHeight: '1.5' },

  featureSection: { padding: '100px 20px', background: '#1a1a1a', color: '#fff' },
  featureHeader: { textAlign: 'center' as const, marginBottom: '60px' },
  featureLabel: { color: '#eecb33', fontSize: '14px', fontWeight: 'bold' as const, letterSpacing: '2px', marginBottom: '15px', display: 'block' },
  featureMainTitle: { fontSize: '36px', fontWeight: 'bold' as const, maxWidth: '600px', margin: '0 auto' },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px', maxWidth: '1100px', margin: '0 auto' },
  featureItem: { textAlign: 'left' as const },
  featureIcon: { fontSize: '32px', marginBottom: '20px' },
  infoTitle: { color: '#eecb33', fontSize: '20px', fontWeight: 'bold' as const, marginBottom: '15px' },
  infoText: { color: '#aaa', fontSize: '15px', lineHeight: '1.6' },

  ctaSection: { padding: '100px 20px', textAlign: 'center' as const, background: '#eecb33' },
  ctaTitle: { fontSize: '40px', fontWeight: '900' as const, color: '#1a1a1a', marginBottom: '30px' },
  ctaBtn: { background: '#1a1a1a', color: '#fff', padding: '18px 40px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '18px' }
}