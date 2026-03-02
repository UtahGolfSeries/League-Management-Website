'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import PageHeader from '../components/pageHeader'
import { calculateTournamentResult } from '../utils/golfLogic'

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

  const [unverifiedPool, setUnverifiedPool] = useState<any[]>([])
  const [isVerifying, setIsVerifying] = useState(false)

  // 1. AUTO-RESTORE DRAFT FROM LOCAL STORAGE
  useEffect(() => {
    if (leagueSettings?.current_week) {
      const savedDraft = localStorage.getItem(`draft_week_${leagueSettings.current_week}`);
      if (savedDraft) {
        try {
          setGrossScores(JSON.parse(savedDraft));
        } catch (e) {
          console.error("Failed to parse draft scores");
        }
      }
    }
  }, [leagueSettings]);

  const checkAccessAndFetchData = async () => {
    const userUuid = user?.auth_user_id || user?.id;
    if (!userUuid || typeof userUuid !== 'string' || userUuid.length < 20) {
      setLoading(false);
      return;
    }

    try {
      // Fetch settings with game_type
      const { data: settingsData } = await supabase.from('league_settings').select('*, game_types(name, scoring_format)').eq('id', 1).single()
      if (settingsData) setLeagueSettings(settingsData)

      const { data: membership, error: memError } = await supabase
        .from('memberships')
        .select('course_id, handicap_index, is_checked_in, has_submitted_current_round, courses(*)')
        .eq('user_id', userUuid)
        .maybeSingle();
      
      if (memError) throw memError;
      if (!membership) {
        setStatusMessage("No clubhouse membership found.");
        setIsAllowed(false);
        setLoading(false);
        return;
      }

      setCourse(membership.courses)

      const { data: userData } = await supabase
        .from('member')
        .select('id, display_name') 
        .eq('auth_user_id', userUuid)
        .single();

      if (userData) {
        setMemberId(userData.id)
        setGolferName(userData.display_name ?? 'Anonymous')
        setCurrentHandicap(Number(membership.handicap_index) || 0)
        
        if (!membership.is_checked_in) {
          setIsAllowed(false)
          setStatusMessage("Please check in at the front desk to unlock your scorecard.")
        } else {
          setIsAllowed(true)
        }

        if (membership.has_submitted_current_round) {
          const { data: mine } = await supabase
            .from('scorecards')
            .select('*')
            .eq('member_id', userData.id)
            .eq('course_id', membership.course_id)
            .eq('week_number', settingsData.current_week)
            .maybeSingle()
          
          setMyScorecard(mine)

          const { data: pool } = await supabase
            .from('scorecards')
            .select('*, member:member_id(display_name)')
            .eq('course_id', membership.course_id)
            .eq('week_number', settingsData.current_week)
            .eq('is_verified', false)
            .neq('member_id', userData.id);
          
          setUnverifiedPool(pool || [])
        } else {
          setMyScorecard(null);
        }
      }
    } catch (err: any) {
      console.error("Initialization error:", err.message)
      setStatusMessage("Sync Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. REAL-TIME SUBSCRIPTION FOR POOL UPDATES
  useEffect(() => {
    if (!memberId || !leagueSettings) return;
    const channel = supabase
      .channel('member_live_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scorecards' }, () => {
          checkAccessAndFetchData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scorecards' }, () => {
          checkAccessAndFetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memberId, leagueSettings]);

  useEffect(() => {
    if (!authLoading && user) checkAccessAndFetchData()
    else if (!authLoading && !user) router.push('/')
  }, [user, authLoading])

  // 3. AUTO-SAVE DRAFT ON CHANGE
  const handleScoreChange = (index: number, val: string) => {
    const newScores = [...grossScores]
    const numericVal = parseInt(val) || 0
    newScores[index] = numericVal
    setGrossScores(newScores)
    
    // Immediate persist to local storage
    if (leagueSettings?.current_week) {
      localStorage.setItem(
        `draft_week_${leagueSettings.current_week}`, 
        JSON.stringify(newScores)
      );
    }
  }

  const isNineHoles = leagueSettings?.holes_to_play === 9
  const effectiveHandicap = isNineHoles ? Math.floor(currentHandicap / 2) : currentHandicap
  const showFront9 = leagueSettings?.holes_to_play === 18 || leagueSettings?.side_to_play === 'Front' || (isNineHoles && leagueSettings?.side_to_play === 'All')
  const showBack9 = leagueSettings?.holes_to_play === 18 || leagueSettings?.side_to_play === 'Back'
  
  const activeIndices = leagueSettings?.holes_to_play === 18 
    ? Array.from({length: 18}, (_, i) => i) 
    : (leagueSettings?.side_to_play === 'Back' ? [9,10,11,12,13,14,15,16,17] : [0,1,2,3,4,5,6,7,8])

  const outTotal = grossScores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = grossScores.slice(9, 18).reduce((a, b) => a + b, 0)
  const totalGross = activeIndices.reduce((sum, idx) => sum + grossScores[idx], 0)

  // Helper for inline calculations (Net or Chicago)
  const getLiveResult = () => {
    if (!course || !leagueSettings) return 0;
    
    // Mock a scorecard object for the utility function
    const tempCard = {
      hole_scores: grossScores,
      handicap_index: effectiveHandicap,
      holes_played: leagueSettings.holes_to_play,
      net_score: calculateNet() // fallback
    };

    return calculateTournamentResult(
      tempCard, 
      null, // Partner not supported in live grid yet
      leagueSettings.game_types?.name || 'Stroke Play', 
      course
    );
  }

  const calculateNet = () => {
    return activeIndices.reduce((sum, i) => {
      if (!course?.handicap_values) return sum
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
    const userUuid = user?.auth_user_id || user?.id;
    if (!course || !memberId || !leagueSettings || !userUuid) return
    if (activeIndices.some(idx => !grossScores[idx])) return alert("Please enter scores for all holes.");

    try {
      const { error } = await supabase.from('scorecards').insert({
        member_id: memberId, course_id: course.id, week_number: leagueSettings.current_week, 
        score: totalGross, net_score: calculateNet(), hole_scores: grossScores, 
        holes_played: leagueSettings.holes_to_play, tee_played: leagueSettings.tee_color,
        side_played: leagueSettings.side_to_play, is_verified: false
      })
      if (error) throw error
      
      await supabase.from('memberships').update({ has_submitted_current_round: true }).match({ user_id: userUuid, course_id: course.id })
      
      // 4. CLEAR DRAFT STORAGE ON SUCCESSFUL SUBMIT
      localStorage.removeItem(`draft_week_${leagueSettings.current_week}`);
      
      await checkAccessAndFetchData();
    } catch (err: any) { alert(err.message) }
  }

  const handleVerifyFromPool = async (cardId: number) => {
    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from('scorecards')
        .update({ is_verified: true, verified_by: memberId })
        .eq('id', cardId);
      
      if (error) throw error;
      alert("Attestation complete!");
      await checkAccessAndFetchData();
    } catch (err: any) { alert(err.message); } finally { setIsVerifying(false); }
  }

  if (loading || authLoading) return <div style={{padding: '40px', textAlign: 'center'}}>Syncing with Clubhouse...</div>

  const isChicago = leagueSettings?.game_types?.name === 'Chicago';

  return (
    <div style={styles.container}>
      {!isAllowed ? (
        <>
          <PageHeader title="Scorecard Locked" subtitle="Check-in Required" />
          <div style={styles.summary}>
            <p style={{textAlign: 'center', color: '#000'}}>{statusMessage}</p>
            <button onClick={() => router.push('/account')} style={{...styles.btn, marginTop: '15px'}}>My Account</button>
          </div>
        </>
      ) : myScorecard ? (
        <>
          <PageHeader title={course?.name || "Tournament"} subtitle={`ROUND SUMMARY: ${leagueSettings?.game_types?.name || 'Stroke Play'}`} />
          <div style={styles.summary}>
            <div style={styles.summaryRow}><strong>Gross:</strong> <span>{myScorecard.score}</span></div>
            <div style={styles.summaryRow}>
                <strong>{isChicago ? 'Total Points:' : 'Net Score:'}</strong> 
                <span style={{color: '#eecb33', fontWeight: 'bold'}}>
                    {calculateTournamentResult(myScorecard, null, leagueSettings?.game_types?.name, course)}
                </span>
            </div>
            <p style={{fontSize: '11px', color: myScorecard.is_verified ? '#2e7d32' : '#d32f2f', marginTop: '10px', fontWeight: 'bold', textAlign: 'center'}}>
              {myScorecard.is_verified ? "✅ Verified" : "⏳ Awaiting Peer Verification"}
            </p>
          </div>
          <hr style={{margin: '25px 0', border: '0', borderTop: '1px solid #ddd'}} />
          <h2 style={{fontSize: '16px', marginBottom: '15px', color: '#000'}}>Verification Pool</h2>
          {unverifiedPool.length === 0 ? (
            <p style={{fontSize: '12px', color: '#888', textAlign: 'center'}}>No cards waiting in the pool.</p>
          ) : (
            unverifiedPool.map(card => (
              <div key={card.id} style={{...styles.summary, border: '1px solid #eecb33', marginBottom: '15px'}}>
                <h3 style={{fontSize: '14px', marginBottom: '10px', color: '#000'}}>{card.member?.display_name}</h3>
                <div style={styles.scoreRow}>
                    {activeIndices.slice(0, 5).map(idx => (
                        <div key={idx} style={styles.holeBox}><div style={styles.label}>H{idx+1}</div><span style={{color:'#000', fontWeight:'bold'}}>{card.hole_scores[idx]}</span></div>
                    ))}
                    <div style={styles.holeBox}>...</div>
                </div>
                <button onClick={() => handleVerifyFromPool(card.id)} disabled={isVerifying} style={{...styles.btn, padding: '10px', marginTop: '10px', fontSize: '13px'}}>Verify {card.member?.display_name}</button>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <PageHeader title={course?.name || "Scorecard"} subtitle={`${leagueSettings?.game_types?.name || 'Stroke Play'} • WEEK ${leagueSettings?.current_week}`} />
          {showFront9 && (
            <div style={{marginBottom: '20px'}}>
              <h3 style={{fontSize: '14px', marginBottom: '10px', color: '#000'}}>Front 9 (Out: {outTotal})</h3>
              <div style={styles.scoreRow}>
                {course?.par_values?.slice(0, 9).map((par: number, i: number) => (
                  <div key={i} style={styles.holeBox}>
                    <div style={styles.label}>H{i+1}</div>
                    <div style={styles.parLabel}>P{par}</div>
                    <input type="number" inputMode="numeric" value={grossScores[i] || ''} style={styles.input} onChange={(e) => handleScoreChange(i, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showBack9 && (
            <div style={{marginBottom: '20px'}}>
              <h3 style={{fontSize: '14px', marginBottom: '10px', color: '#000'}}>Back 9 (In: {inTotal})</h3>
              <div style={styles.scoreRow}>
                {course?.par_values?.slice(9, 18).map((par: number, i: number) => (
                  <div key={i+9} style={styles.holeBox}>
                    <div style={styles.label}>H{i+10}</div>
                    <div style={styles.parLabel}>P{par}</div>
                    <input type="number" inputMode="numeric" value={grossScores[i+9] || ''} style={styles.input} onChange={(e) => handleScoreChange(i+9, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.summary}>
            <div style={styles.summaryRow}><span>Gross:</span> <strong>{totalGross}</strong></div>
            <div style={{...styles.summaryRow, color: '#eecb33', fontSize: '18px'}}>
                <span>{isChicago ? 'Total Points:' : 'Total Net:'}</span> 
                <strong>{getLiveResult()}</strong>
            </div>
          </div>
          <button onClick={submitScore} style={styles.btn}>Submit Round</button>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  scoreRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' },
  holeBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', border: '1px solid #ddd', padding: '5px', borderRadius: '4px', background: '#fff' },
  label: { fontSize: '10px', color: '#666' },
  parLabel: { fontSize: '10px', fontWeight: 'bold' as const, color: '#000' },
  input: { width: '100%', border: 'none', borderBottom: '2px solid #2e7d32', textAlign: 'center' as const, fontSize: '18px', fontWeight: 'bold' as const, outline: 'none', color: '#000' },
  summary: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #eee' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#000' },
  btn: { width: '100%', padding: '15px', background: '#eecb33', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer' }
}