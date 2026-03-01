'use client'
import { useState, useEffect } from 'react'
import { supabase, useAuth } from '../context/AuthContext'
import Link from 'next/link'

export default function PlayerDashboard() {
  const { user, courseName } = useAuth()
  const [stats, setStats] = useState({
    avgScore: 0,
    roundsPlayed: 0,
    bestRound: '--',
    handicap: user?.handicap || '0.0'
  })
  const [recentScores, setRecentScores] = useState<any[]>([])

  useEffect(() => {
    if (user) fetchPlayerData()
  }, [user])

  const fetchPlayerData = async () => {
    const { data: scores } = await supabase
      .from('scores')
      .select('*')
      .eq('player_id', user.id)
      .order('date', { ascending: false })

    if (scores && scores.length > 0) {
      const total = scores.reduce((acc, curr) => acc + curr.total_score, 0)
      const best = Math.min(...scores.map(s => s.total_score))
      
      setStats({
        ...stats,
        avgScore: Math.round(total / scores.length),
        roundsPlayed: scores.length,
        bestRound: best.toString()
      })
      setRecentScores(scores.slice(0, 5)) 
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.welcome}>Welcome back, {user?.display_name}</h1>
        <p style={styles.courseTag}>{courseName?.toUpperCase()}</p>
      </header>

      {/* UPDATED STATS FLEX GRID */}
      <div style={styles.statsFlexContainer}>
        <div style={{ ...styles.statCard}}>
          <span style={styles.statLabel}>Clubhouse Credit</span>
          <span style={{ ...styles.statValue, color: '#4caf50' }}>
            {formatCurrency(user?.credits)}
          </span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Handicap Index</span>
          <span style={styles.statValue}>{stats.handicap}</span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Avg Score</span>
          <span style={styles.statValue}>{stats.avgScore || '--'}</span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Best Round</span>
          <span style={styles.statValue}>{stats.bestRound}</span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Rounds Played</span>
          <span style={styles.statValue}>{stats.roundsPlayed}</span>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Rounds</h3>
            <Link href="/account" style={styles.viewAll}>View All</Link>
          </div>
          <div style={styles.scoreList}>
            {recentScores.length > 0 ? recentScores.map((score, i) => (
              <div key={i} style={styles.scoreRow}>
                <span style={styles.roundDate}>{new Date(score.date).toLocaleDateString()}</span>
                <span style={styles.roundCourse}>{score.course_name || 'Gladstan'}</span>
                <span style={styles.roundScore}>{score.total_score}</span>
              </div>
            )) : (
              <p style={styles.emptyText}>No rounds recorded yet.</p>
            )}
          </div>
        </section>

        <section style={styles.actionSection}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <Link href="/enter-score" style={styles.actionBtn}>Post New Score</Link>
          <Link href="/standings" style={styles.secondaryBtn}>View Standings</Link>
          <Link href="/schedule" style={styles.secondaryBtn}>Next Tee Time</Link>
        </section>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' as const },
  header: { marginBottom: '40px' },
  welcome: { fontSize: '32px', fontWeight: '900' as const, color: '#1a1a1a', margin: 0 },
  courseTag: { color: '#eecb33', fontWeight: 'bold' as const, letterSpacing: '1px', marginTop: '5px' },
  
  // THE FIX: Flex Container for centering drops
  statsFlexContainer: { 
    display: 'flex', 
    flexWrap: 'wrap' as const, 
    justifyContent: 'center', 
    gap: '20px', 
    marginBottom: '40px' 
  },
  statCard: { 
    background: '#1a1a1a', 
    padding: '25px', 
    borderRadius: '16px', 
    color: '#fff', 
    textAlign: 'center' as const,
    flex: '1 1 180px', // Allows them to grow and shrink, but start at 180px
    maxWidth: '220px'  // Prevents cards from getting comically wide on huge screens
  },

  statLabel: { display: 'block', color: '#888', fontSize: '12px', textTransform: 'uppercase' as const, fontWeight: 'bold' as const, marginBottom: '10px' },
  statValue: { fontSize: '30px', fontWeight: 'bold' as const, color: '#eecb33' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' },
  section: { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold' as const },
  viewAll: { fontSize: '13px', color: '#eecb33', textDecoration: 'none', fontWeight: 'bold' as const },
  scoreList: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  scoreRow: { display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f9f9f9', borderRadius: '8px' },
  roundDate: { fontSize: '14px', color: '#666' },
  roundCourse: { fontSize: '14px', fontWeight: 'bold' as const },
  roundScore: { fontWeight: '900' as const, color: '#1a1a1a' },
  actionSection: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  actionBtn: { padding: '18px', background: '#eecb33', color: '#1a1a1a', textAlign: 'center' as const, borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '16px', boxShadow: '0 4px 10px rgba(238, 203, 51, 0.3)' },
  secondaryBtn: { padding: '15px', border: '1px solid #ddd', color: '#1a1a1a', textAlign: 'center' as const, borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '14px' },
  emptyText: { color: '#999', fontSize: '14px', textAlign: 'center' as const, padding: '20px' }
}