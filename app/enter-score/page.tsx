'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import PageHeader from '../components/pageHeader' // Import shared component

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function EnterScore() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [course, setCourse] = useState<any>(null)
  const [grossScores, setGrossScores] = useState<number[]>(new Array(18).fill(0))
  const [currentHandicap, setCurrentHandicap] = useState<number>(0)
  const [golferName, setGolferName] = useState<string>('')
  const [memberId, setMemberId] = useState<number | null>(null)
  const [leagueSettings, setLeagueSettings] = useState<any>(null)
  const [myScorecard, setMyScorecard] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [partnerScorecards, setPartnerScorecards] = useState<any[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [isPairingLoading, setIsPairingLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
    }
  }, [user, authLoading])
  
  const checkAccessAndFetchData = async () => {
    if (!user) return;
    try {
      const { data: settingsData } = await supabase.from('league_settings').select('*').eq('id', 1).single()
      if (settingsData) setLeagueSettings(settingsData)

      const { data: courseData } = await supabase.from('courses').select('*').limit(1).single()
      if (courseData) setCourse(courseData)

      const { data: userData } = await supabase
        .from('member')
        .select('id, handicap_index, display_name, has_submitted_current_round, is_checked_in') 
        .eq('auth_user_id', user.id)
        .single();

      if (userData) {
        setMemberId(userData.id)
        setCurrentHandicap(userData.handicap_index ?? 0)
        setGolferName(userData.display_name ?? 'Anonymous Golfer')
        
        if (!userData.is_checked_in) {
          setIsAllowed(false)
          setStatusMessage("Please check in at the front desk to unlock your scorecard.")
        } else {
          setIsAllowed(true)
        }

        if (userData.has_submitted_current_round) {
          const { data: mine } = await supabase
            .from('scorecards')
            .select('*')
            .eq('member_id', userData.id)
            .eq('week_number', settingsData.current_week)
            .maybeSingle()
          setMyScorecard(mine)
        }

        const { data: pairings } = await supabase
          .from('weekly_pairings')
          .select('player_1_id, player_2_id')
          .eq('week_number', settingsData.current_week)
          .or(`player_1_id.eq.${userData.id},player_2_id.eq.${userData.id}`);

        if (pairings && pairings.length > 0) {
          const partnerIds = Array.from(new Set(pairings.flatMap(p => [p.player_1_id, p.player_2_id])))
            .filter(id => id !== userData.id);

          const { data: pInfos } = await supabase.from('member').select('id, display_name').in('id', partnerIds)
          setGroupMembers(pInfos || [])

          const { data: pCards } = await supabase
            .from('scorecards')
            .select('*, member!member_id(display_name)') 
            .in('member_id', partnerIds)
            .eq('week_number', settingsData.current_week);
          
          setPartnerScorecards(pCards || [])
        } else {
          const { data: potential } = await supabase.from('member').select('id, display_name').eq('is_checked_in', true).neq('id', userData.id).neq('role', 'admin')
          setAvailablePlayers(potential || [])
        }
      }
    } catch (err) {
      console.error("Initialization error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!memberId || !leagueSettings) return;
    const channel = supabase
      .channel('live_tournament_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards' }, () => {
          checkAccessAndFetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memberId, leagueSettings]);

  useEffect(() => {
    checkAccessAndFetchData()
  }, [user])

  const handleCreatePairing = async (p2Id: number) => {
    if (!memberId || !leagueSettings) return
    setIsPairingLoading(true)
    try {
      await supabase.from('weekly_pairings').insert({ week_number: leagueSettings.current_week, player_1_id: memberId, player_2_id: p2Id })
      await checkAccessAndFetchData()
    } catch (err: any) { alert("Pairing failed.") } finally { setIsPairingLoading(false) }
  }

  const handleScoreChange = (index: number, val: string) => {
    const newScores = [...grossScores]
    newScores[index] = parseInt(val) || 0
    setGrossScores(newScores)
  }

  const isNineHoles = leagueSettings?.holes_to_play === 9
  const effectiveHandicap = isNineHoles ? Math.floor(currentHandicap / 2) : currentHandicap
  const showFront9 = leagueSettings?.holes_to_play === 18 || leagueSettings?.side_to_play === 'Front' || (isNineHoles && leagueSettings?.side_to_play === 'All')
  const showBack9 = leagueSettings?.holes_to_play === 18 || leagueSettings?.side_to_play === 'Back'
  
  const activeIndices = leagueSettings?.holes_to_play === 18 
    ? [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] 
    : (leagueSettings?.side_to_play === 'Back' ? [9,10,11,12,13,14,15,16,17] : [0,1,2,3,4,5,6,7,8])

  const outTotal = grossScores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = grossScores.slice(9, 18).reduce((a, b) => a + b, 0)
  const totalGross = activeIndices.reduce((sum, idx) => sum + grossScores[idx], 0)

  const calculateNet = () => {
    return activeIndices.reduce((sum, i) => {
      if (!course) return sum
      const hcpVal = course.handicap_values[i]
      let p = 0
      if (isNineHoles) {
        const sideRank = Math.ceil(hcpVal / 2); if (effectiveHandicap >= sideRank) p++; if (effectiveHandicap >= sideRank + 9) p++;
      } else {
        if (effectiveHandicap >= hcpVal) p++; if (effectiveHandicap >= hcpVal + 18) p++;
      }
      return sum + (grossScores[i] - p)
    }, 0)
  }

  const submitScore = async () => {
    if (!course || !memberId || !leagueSettings) return
    if (activeIndices.some(idx => !grossScores[idx])) return alert("Missing score for active holes.");

    try {
      const { error } = await supabase.from('scorecards').insert({
        member_id: memberId, week_number: leagueSettings.current_week, score: totalGross, net_score: calculateNet(),
        hole_scores: grossScores, holes_played: leagueSettings.holes_to_play, tee_played: leagueSettings.tee_color,
        side_played: leagueSettings.side_to_play, is_verified: false
      })
      if (error) throw error
      await supabase.from('member').update({ has_submitted_current_round: true }).eq('id', memberId)
      setLoading(true); await checkAccessAndFetchData();
    } catch (err: any) { alert(err.message) }
  }

  const handleVerifyPartner = async (cardId: number) => {
    setIsVerifying(true);
    try {
      const { error } = await supabase.from('scorecards').update({ is_verified: true, verified_by: memberId }).eq('id', cardId);
      if (error) throw error;
      alert("Card attested!");
      if (partnerScorecards.filter(c => !c.is_verified).length <= 1) router.push('/standings');
    } catch (err: any) { alert(err.message); } finally { setIsVerifying(false); }
  }

  if (loading || authLoading) return <div style={{padding: '20px'}}>Loading Tournament Data...</div>

  if (!isAllowed) return (
    <div style={styles.container}>
      <PageHeader title="Scorecard Locked" subtitle="Check-in Required" />
      <div style={{...styles.summary, textAlign: 'center' as const, marginTop: '20px'}}>
        <p>{statusMessage}</p>
        <button onClick={() => router.push('/account')} style={{...styles.btn, marginTop: '20px'}}>My Account</button>
      </div>
    </div>
  )

  if (groupMembers.length === 0) return (
    <div style={styles.container}>
      <PageHeader title="Select Partner" subtitle="Pairing Required" />
      <p style={{textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '25px'}}>Select the member you are playing with.</p>
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {availablePlayers.map(p => (
          <button key={p.id} style={{...styles.btn, background: '#fff', color: '#000', border: '1px solid #ddd', textAlign: 'left', display: 'flex', justifyContent: 'space-between'}} onClick={() => handleCreatePairing(p.id)}>
            <span>{p.display_name}</span><span style={{color: '#eecb33'}}>Select →</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (myScorecard) return (
    <div style={styles.container}>
      <PageHeader 
        title={course?.name || "Tournament"} 
        subtitle="ROUND SUMMARY & ATTESTATION" 
      />
      
      <div style={styles.summary}>
        <h2 style={{margin: '0 0 10px 0', fontSize: '18px'}}>Your Round Summary</h2>
        <div style={styles.summaryRow}><strong>Gross:</strong> <span>{myScorecard.score}</span></div>
        <div style={styles.summaryRow}><strong>Net:</strong> <span style={{color: '#eecb33', fontWeight: 'bold'}}>{myScorecard.net_score}</span></div>
        <p style={{fontSize: '11px', color: myScorecard.is_verified ? '#eecb33' : '#d32f2f', marginTop: '10px', fontWeight: 'bold'}}>
          {myScorecard.is_verified ? "✅ Verified by Group" : "Awaiting Verification"}
        </p>
      </div>
      <hr style={{margin: '25px 0', border: '0', borderTop: '1px solid #ddd'}} />
      <h2 style={{fontSize: '16px', marginBottom: '15px'}}>Review Group Scores</h2>
      {groupMembers.map(partnerMember => {
        const card = partnerScorecards.find(c => c.member_id === partnerMember.id);
        return (
          <div key={partnerMember.id} style={{...styles.summary, border: card?.is_verified ? '1px solid #ddd' : '1px solid #eecb33', marginBottom: '15px'}}>
            <h3 style={{margin: '0 0 10px 0', fontSize: '14px', color: '#000'}}>{partnerMember.display_name}</h3>
            {card ? (
              card.is_verified ? <p style={{color: '#eecb33', textAlign: 'center', fontWeight: 'bold'}}>✅ Card Attested</p> :
              <>
                <div style={styles.scoreRow}>
                  {activeIndices.map(idx => (
                    <div key={idx} style={styles.holeBox}>
                      <div style={styles.label}>H{idx+1}</div>
                      <div style={{fontSize: '18px', fontWeight: 'bold', color: '#000'}}>{card.hole_scores[idx]}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleVerifyPartner(card.id)} disabled={isVerifying} style={{...styles.btn, padding: '10px'}}>Verify {partnerMember.display_name}</button>
              </>
            ) : <p style={{fontSize: '12px', color: '#888', textAlign: 'center'}}>Still playing...</p>}
          </div>
        );
      })}
    </div>
  )

  return (
    <div style={styles.container}>
      <PageHeader 
        title={course?.name || "Tournament"} 
        subtitle={`WEEK ${leagueSettings?.current_week} • ${leagueSettings?.holes_to_play} HOLES • ${leagueSettings?.tee_color} TEES`}
      />
      
      {/* Darkened "Playing with" line */}
      <div style={{background: '#f0f7f0', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9', textAlign: 'center', marginBottom: '20px', fontSize: '14px', color: '#000', fontWeight: 'bold'}}>
        Playing with: {groupMembers.map(m => m.display_name).join(', ')}
      </div>
      
      {showFront9 && (
        <>
          <h3 style={{marginBottom: '10px'}}>Front 9 (Out: {outTotal})</h3>
          <div style={styles.scoreRow}>
            {course?.par_values.slice(0, 9).map((par: number, i: number) => (
              <div key={i} style={styles.holeBox}>
                <div style={styles.label}>H{i+1}</div>
                <div style={styles.parLabel}>P{par}</div>
                <div style={styles.hcpLabel}>HCP {course?.handicap_values[i]}</div>
                <div style={styles.popDots}>
                  {(() => {
                    const sideRank = isNineHoles ? Math.ceil(course.handicap_values[i] / 2) : course.handicap_values[i]
                    const dots = []; if (effectiveHandicap >= sideRank) dots.push('•'); if (effectiveHandicap >= sideRank + (isNineHoles ? 9 : 18)) dots.push('•');
                    return dots.join('')
                  })()}
                </div>
                <input type="number" inputMode="numeric" style={styles.input} onChange={(e) => handleScoreChange(i, e.target.value)} />
              </div>
            ))}
          </div>
        </>
      )}

      {showBack9 && (
        <>
          <h3 style={{marginBottom: '10px'}}>Back 9 (In: {inTotal})</h3>
          <div style={styles.scoreRow}>
            {course?.par_values.slice(9, 18).map((par: number, i: number) => (
              <div key={i+9} style={styles.holeBox}>
                <div style={styles.label}>H{i+10}</div>
                <div style={styles.parLabel}>P{par}</div>
                <div style={styles.hcpLabel}>HCP {course?.handicap_values[i+9]}</div>
                <div style={styles.popDots}>
                  {(() => {
                    const sideRank = isNineHoles ? Math.ceil(course.handicap_values[i+9] / 2) : course.handicap_values[i+9]
                    const dots = []; if (effectiveHandicap >= sideRank) dots.push('•'); if (effectiveHandicap >= sideRank + (isNineHoles ? 9 : 18)) dots.push('•');
                    return dots.join('')
                  })()}
                </div>
                <input type="number" inputMode="numeric" style={styles.input} onChange={(e) => handleScoreChange(i+9, e.target.value)} />
              </div>
            ))}
          </div>
        </>
      )}

      <div style={styles.summary}>
        <div style={styles.summaryRow}><strong>Golfer:</strong> <span>{golferName}</span></div>
        {showFront9 && (
          <div style={styles.summaryRow}><span>Front 9 (Out):</span> <span>{outTotal}</span></div>
        )}
        {showBack9 && (
          <div style={styles.summaryRow}><span>Back 9 (In):</span> <span>{inTotal}</span></div>
        )}
        <div style={styles.summaryRow}><span>Season Index:</span> <span>{currentHandicap}</span></div>
        <div style={{...styles.summaryRow, color: '#eecb33', fontWeight: 'bold'}}><span>Round Handicap:</span> <span>{effectiveHandicap}</span></div>
        <div style={{...styles.summaryRow, marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '10px'}}><strong>Total Gross:</strong> <strong>{totalGross}</strong></div>
        <div style={{...styles.summaryRow, fontSize: '18px', color: '#eecb33'}}><strong>Total Net:</strong> <strong>{calculateNet()}</strong></div>
      </div>
      <button onClick={submitScore} style={styles.btn}>Submit Round</button>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  scoreRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' },
  holeBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', border: '1px solid #ddd', padding: '5px', borderRadius: '4px', background: '#fff' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#000' },
  parLabel: { fontSize: '10px', color: '#444', fontWeight: 'bold' as const },
  hcpLabel: { fontSize: '9px', color: '#666' },
  popDots: { fontSize: '14px', color: '#eecb33', height: '14px', lineHeight: '14px' },
  input: { width: '100%', border: 'none', borderBottom: '2px solid #2e7d32', textAlign: 'center' as const, fontSize: '18px', padding: '5px 0', outline: 'none', color: '#000', fontWeight: 'bold' },
  summary: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', color: '#222', margin: '20px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' },
  btn: { width: '100%', padding: '15px', background: '#eecb33', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' }
}