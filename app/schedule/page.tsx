'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import PageHeader from '../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function MemberSchedule() {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Get today's date in YYYY-MM-DD format for comparison
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchSchedule = async () => {
      const { data } = await supabase
        .from('schedule')
        .select('*')
        .order('week_number', { ascending: true })
      
      if (data) setSchedule(data)
      setLoading(false)
    }
    fetchSchedule()
  }, [])

  // Helper to format the date (e.g., "Feb 23")
  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD"
    const date = new Date(dateString + 'T00:00:00') // Force local time
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return <div style={styles.loader}>Loading Season Schedule...</div>

  return (
    <div style={styles.container}>
      <PageHeader 
        title="League Schedule" 
        subtitle="SEASON OUTLINE & COURSE ROTATION" 
      />
      
      <div style={styles.scheduleList}>
        {schedule.map((wk) => {
          // Logic: If the week's date is before today, it's a past event
          const isPast = wk.week_date && wk.week_date < today

          return (
            <div key={wk.id} style={{
              ...styles.weekCard,
              opacity: isPast ? 0.6 : 1,
              borderLeft: isPast ? '4px solid #ccc' : '4px solid #eecb33',
              backgroundColor: isPast ? '#fcfcfc' : '#fff'
            }}>
              {/* Date Box */}
              <div style={styles.dateBox}>
                <span style={{...styles.dateText, color: isPast ? '#888' : '#eecb33'}}>
                  {formatDate(wk.week_date)}
                </span>
                <span style={styles.weekLabel}>WEEK {wk.week_number}</span>
              </div>

              {/* Game Info */}
              <div style={styles.mainInfo}>
                <div style={styles.gameName}>{wk.game_name}</div>
                <div style={styles.courseDetails}>
                  {wk.course_nine} • {wk.tee_color} Tees
                </div>
              </div>

              {/* Status Indicator */}
              <div style={styles.statusZone}>
                {isPast ? (
                  <span style={styles.pastBadge}>Finished</span>
                ) : (
                  <span style={styles.upcomingBadge}>Upcoming</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  loader: { padding: '100px 20px', textAlign: 'center' as const, color: '#666' },
  scheduleList: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  weekCard: { 
    padding: '20px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    gap: '20px'
  },
  dateBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '70px',
    borderRight: '1px solid #eee',
    paddingRight: '20px'
  },
  dateText: { fontSize: '18px', fontWeight: '900' as const, textTransform: 'uppercase' as const },
  weekLabel: { fontSize: '10px', color: '#aaa', fontWeight: 'bold' as const, marginTop: '2px' },
  mainInfo: { flex: 1 },
  gameName: { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1a1a', marginBottom: '4px' },
  courseDetails: { fontSize: '13px', color: '#666' },
  statusZone: { textAlign: 'right' as const },
  pastBadge: { fontSize: '10px', background: '#eee', color: '#999', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const },
  upcomingBadge: { fontSize: '10px', background: '#f5f3e8', color: '#eecb33', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const }
}