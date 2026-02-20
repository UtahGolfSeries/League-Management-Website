'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function Standings() {
  const { user } = useAuth()
  
  const [viewMode, setViewMode] = useState<'weekly' | 'season'>('season')
  const [standings, setStandings] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [viewingWeek, setViewingWeek] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getInitialSettings = async () => {
      const { data: settings } = await supabase.from('league_settings').select('current_week').eq('id', 1).single()
      if (settings) {
        setCurrentWeek(settings.current_week)
        setViewingWeek(settings.current_week)
      }
    }
    getInitialSettings()
  }, [])

  useEffect(() => {
    if (viewingWeek === 0) return

    const fetchData = async () => {
      setLoading(true)
      try {
        if (viewMode === 'weekly') {
          const { data: scores } = await supabase
            .from('scorecards')
            .select(`score, net_score, points, is_verified, member!member_id (display_name, flight)`)
            .eq('week_number', viewingWeek)
            .eq('is_verified', true)
            .order('net_score', { ascending: true })
          if (scores) setStandings(scores)
        } else {
          const { data: allScores } = await supabase
            .from('scorecards')
            .select(`points, member_id, member!member_id (display_name, flight)`)
            .eq('is_verified', true)

          if (allScores) {
            const processedSeason = processSeasonPoints(allScores)
            setStandings(processedSeason)
          }
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [viewMode, viewingWeek])

  const processSeasonPoints = (data: any[]) => {
    const results: any = {}

    data.forEach(entry => {
      const mId = entry.member_id
      if (!results[mId]) {
        results[mId] = { 
          name: entry.member.display_name, 
          flight: entry.member.flight, 
          totalPoints: 0,
          eventsPlayed: 0
        }
      }
      results[mId].totalPoints += (Number(entry.points) || 0)
      results[mId].eventsPlayed += 1 
    })

    return Object.values(results).sort((a: any, b: any) => b.totalPoints - a.totalPoints)
  }

  const flights = ['A', 'B', 'C', 'D']

  return (
    <div style={styles.container}>
      <PageHeader 
        title={viewMode === 'weekly' ? `Week ${viewingWeek} Leaderboard` : "Season Standings"}
        subtitle={viewMode === 'weekly' ? "ROUND RESULTS" : "UTAH GOLF SERIES POINTS RACE"}
        rightElement={
          <div style={styles.headerControls}>
             <div style={styles.toggleGroup}>
                <button 
                  onClick={() => setViewMode('weekly')} 
                  style={viewMode === 'weekly' ? styles.activeToggle : styles.inactiveToggle}
                >Weekly</button>
                <button 
                  onClick={() => setViewMode('season')} 
                  style={viewMode === 'season' ? styles.activeToggle : styles.inactiveToggle}
                >Season</button>
             </div>

            {viewMode === 'weekly' && (
              <select 
                value={viewingWeek} 
                onChange={(e) => setViewingWeek(Number(e.target.value))}
                style={styles.weekSelect}
              >
                {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>Loading Rankings...</div>
      ) : (
        <>
          {flights.map(flightLabel => {
            const flightScores = standings.filter(s => 
               (viewMode === 'weekly' ? s.member?.flight : s.flight) === flightLabel
            )
            if (flightScores.length === 0) return null

            return (
              <div key={flightLabel} style={styles.section}>
                <div style={styles.flightHeader}>Flight {flightLabel}</div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th style={{...styles.th, width: '60px'}}>Rank</th>
                        <th style={{...styles.th, width: '300px'}}>Player</th>
                        {viewMode === 'weekly' ? (
                          <>
                            <th style={{...styles.th}}>Net</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Pts</th>
                          </>
                        ) : (
                          <>
                            {/* Swapped: Points on Left, Events on Right */}
                            <th style={{...styles.th, textAlign: 'center', color: '#eecb33'}}>Total Pts</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Events Played</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {flightScores.map((entry, index) => (
                        <tr key={index} style={styles.tr}>
                          <td style={styles.rankCell}>{index + 1}</td>
                          <td style={styles.playerCell}>{viewMode === 'weekly' ? entry.member?.display_name : entry.name}</td>
                          
                          {viewMode === 'weekly' ? (
                            <>
                              <td style={styles.td}>{entry.net_score}</td>
                              <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold'}}>{entry.points}</td>
                            </>
                          ) : (
                            <>
                              {/* Swapped Data Cells */}
                              <td style={{...styles.td, textAlign: 'center', fontWeight: '900', color: '#eecb33', backgroundColor: '#f5f5e8'}}>
                                {entry.totalPoints}
                              </td>
                              <td style={{...styles.td, textAlign: 'center', color: '#888'}}>
                                {entry.eventsPlayed}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  headerControls: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '8px' },
  toggleGroup: { display: 'flex', background: '#333', borderRadius: '6px', padding: '2px' },
  activeToggle: { background: '#eecb33', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold' as const, cursor: 'pointer' },
  inactiveToggle: { background: 'transparent', color: '#bbb', border: 'none', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' },
  weekSelect: { padding: '6px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', fontSize: '12px' },
  section: { marginBottom: '30px' },
  flightHeader: { background: '#111', color: '#fff', padding: '12px 15px', borderRadius: '8px 8px 0 0', fontWeight: 'bold' as const, fontSize: '14px', letterSpacing: '1px' },
  tableWrapper: { background: '#fff', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thRow: { background: '#fafafa', borderBottom: '1px solid #eee' },
  th: { width: '150px', padding: '12px 15px', fontSize: '10px', color: '#999', textAlign: 'left' as const, textTransform: 'uppercase' as const, fontWeight: 'bold' as const },
  td: { padding: '12px 15px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#333' },
  tr: { background: '#fff' },
  rankCell: { padding: '12px 15px', borderBottom: '1px solid #eee', fontWeight: 'bold' as const, color: '#eecb33', textAlign: 'center' as const },
  playerCell: { padding: '12px 15px', borderBottom: '1px solid #eee', fontWeight: 'bold' as const, color: '#000' }
}