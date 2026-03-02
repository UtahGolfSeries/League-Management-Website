'use client'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import PageHeader from '../../components/pageHeader' 
import { calculateTournamentResult } from '../../utils/golfLogic'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function TournamentOps() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<any>(null);
  
  const [members, setMembers] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [viewingWeek, setViewingWeek] = useState<number>(0)
  const [expandedPlayerUuid, setExpandedPlayerUuid] = useState<string | null>(null)
  const [activeGameType, setActiveGameType] = useState<string>('Individual Stroke Play')

  const [viewState, setViewState] = useState<'checking' | 'authorized' | 'denied'>('checking')
  const [dataLoading, setDataLoading] = useState(false)
  const [isGlobalUpdating, setIsGlobalUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showModal, setShowModal] = useState(false)
  const [roundSettings, setRoundSettings] = useState({
    holes: 18,
    tee: 'White',
    side: 'All' 
  })

  const [manualEntryPlayer, setManualEntryPlayer] = useState<any>(null);
  const [manualScores, setManualScores] = useState<number[]>(new Array(18).fill(0));
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // --- UI FORMATTING ---
  const formatCurrency = (amount: string) => {
    const totalCents = parseInt(amount) || 0;
    return (totalCents / 100).toFixed(2);
  };

  const handleTableWinningsChange = (cardId: string, newVal: string) => {
    const digits = newVal.replace(/\D/g, '')
    const inputEl = document.getElementById(`win-${cardId}`) as HTMLInputElement;
    if (inputEl) inputEl.value = formatCurrency(digits);
  };

  useEffect(() => {
    if (!authLoading) {
      if (user?.role === 'admin' || user?.role === 'superadmin') setViewState('authorized')
      else { setViewState('denied'); router.replace('/'); }
    }
  }, [user, authLoading, router])

  const loadTournamentData = async () => {
    const adminUuid = user?.auth_user_id || user?.id;
    if (!adminUuid || String(adminUuid).length < 10) return;

    setDataLoading(true);
    try {
      const { data: adminMembership } = await supabase
        .from('memberships')
        .select(`course_id, courses (*)`)
        .eq('user_id', adminUuid)
        .maybeSingle();

      if (!adminMembership) {
        setDataLoading(false);
        return;
      }

      setCourse(adminMembership.courses);
      const activeCourseId = adminMembership.course_id;

      const { data: settings } = await supabase
        .from('league_settings')
        .select('*')
        .eq('course_id', activeCourseId)
        .single();

      if (settings) {
        setCurrentWeek(settings.current_week);
        setActiveGameType(settings.game_type || 'Individual Stroke Play');
        setRoundSettings({
          holes: settings.holes_to_play,
          side: settings.side_to_play,
          tee: settings.tee_color
        });
        if (viewingWeek === 0) setViewingWeek(settings.current_week);
      }

      const { data: rosterRecords, error: fetchError } = await supabase
        .from('memberships')
        .select(`
          role, flight, handicap_index, is_checked_in, has_submitted_current_round, user_id,
          member:user_id (
            id, auth_user_id, display_name, 
            scorecards!member_id (
              id, score, net_score, week_number, winnings, holes_played, 
              tee_played, side_played, hole_scores, created_at, is_verified, course_id
            )
          )
        `)
        .eq('course_id', activeCourseId)
        .eq('role', 'player'); 

      if (fetchError) throw fetchError;

      const { data: pairingData } = await supabase
        .from('weekly_pairings')
        .select('*')
        .eq('week_number', viewingWeek || settings?.current_week);

      if (rosterRecords) {
        const processed = rosterRecords.map(r => {
          const m: any = Array.isArray(r.member) ? r.member[0] : r.member;
          if (!m) return null;

          const weekScore = m.scorecards
            ?.filter((s: any) => s.week_number === (viewingWeek || settings?.current_week) && s.course_id === activeCourseId)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

          const pairing = pairingData?.find(p => String(p.player_1_id) === String(m.id) || String(p.player_2_id) === String(m.id));
          const partner_id = pairing ? (String(pairing.player_1_id) === String(m.id) ? pairing.player_2_id : pairing.player_1_id) : null;

          let detailedStatus = r.is_checked_in ? 'Active' : 'Wait';
          if (weekScore) detailedStatus = weekScore.is_verified ? 'Finished' : 'Unverified';

          return { 
            ...m, 
            membershipUuid: r.user_id, // Map UUID for reset/check-in
            flight: r.flight, 
            handicap_index: r.handicap_index, 
            is_checked_in: r.is_checked_in, 
            has_submitted_current_round: r.has_submitted_current_round,
            weekScore, 
            partner_id, 
            detailedStatus 
          };
        }).filter(Boolean);
        
        setMembers(processed);
      }
    } catch (err: any) { console.error("Load Failure:", err.message); } finally { setDataLoading(false); }
  };

  useEffect(() => {
    if (viewState === 'authorized') loadTournamentData();
    const channel = supabase
      .channel('admin_live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards' }, () => loadTournamentData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => loadTournamentData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewState, viewingWeek]);

  // --- ACTIONS ---
const handlePairing = async (player1Id: any, player2Id: any) => {
    if (!course?.id) return;
    try {
      // 1. Clear any existing pairings for these players this week at THIS course
      await supabase
        .from('weekly_pairings')
        .delete()
        .match({ 
          week_number: viewingWeek, 
          course_id: course.id 
        })
        .or(`player_1_id.eq.${player1Id},player_2_id.eq.${player1Id}`);

      // 2. If a new partner was selected, create the new pairing link
      if (player2Id) {
        await supabase.from('weekly_pairings').insert({ 
          week_number: viewingWeek, 
          course_id: course.id, // Linked to your clubhouse
          player_1_id: player1Id, 
          player_2_id: player2Id 
        });
      }
      
      loadTournamentData();
    } catch (err) { 
      console.error("Pairing error:", err); 
    }
  };

  const toggleCheckIn = async (memberUuid: string, currentStatus: boolean) => {
    await supabase.from('memberships').update({ is_checked_in: !currentStatus })
      .match({ user_id: memberUuid, course_id: course.id });
    loadTournamentData();
  }

  const handleResetScorecard = async (memberUuid: string, memberId: string) => {
    if (!window.confirm("CRITICAL: Delete scorecard and reset status?")) return
    try {
      await supabase.from('scorecards').delete().match({ member_id: memberId, week_number: viewingWeek, course_id: course.id });
      await supabase.from('memberships').update({ has_submitted_current_round: false }).match({ user_id: memberUuid, course_id: course.id });
      loadTournamentData();
    } catch (err: any) { console.error("Reset error:", err.message); }
  }

  const handleWinningsChange = async (cardId: string, amount: string) => {
    const numericAmount = parseFloat(amount) || 0;
    await supabase.from('scorecards').update({ winnings: numericAmount }).eq('id', cardId);
    loadTournamentData();
  };

  const handleManualVerify = async (cardId: string) => {
    await supabase.from('scorecards').update({ is_verified: true, verified_by: user.id }).eq('id', cardId);
    loadTournamentData();
  }

  const submitManualScore = async () => {
    if (!manualEntryPlayer || !course) return;
    setIsSubmittingManual(true);
    try {
        const activeIndices = roundSettings.holes === 18 
        ? Array.from({length: 18}, (_, i) => i) 
        : (roundSettings.side === 'Back' ? [9,10,11,12,13,14,15,16,17] : [0,1,2,3,4,5,6,7,8]);

      const relevantScores = manualScores.filter((_, idx) => activeIndices.includes(idx));
      if (relevantScores.some(s => s === 0 || isNaN(s))) {
          alert("Enter valid score for all active holes.");
          setIsSubmittingManual(false);
          return;
      }
      const totalGross = relevantScores.reduce((a, b) => a + b, 0);

      const tempCard = {
        hole_scores: manualScores,
        handicap_index: manualEntryPlayer.handicap_index,
        holes_played: roundSettings.holes,
        side_played: roundSettings.side
      };

      const finalNet = calculateTournamentResult(tempCard, null, 'Individual Stroke Play', course);

      const { error: scoreError } = await supabase.from('scorecards').insert({
          member_id: manualEntryPlayer.id,      
          course_id: course.id,
          week_number: viewingWeek,
          score: totalGross,
          net_score: finalNet, 
          holes_played: roundSettings.holes,
          tee_played: roundSettings.tee,
          side_played: roundSettings.side,
          hole_scores: manualScores,            
          is_verified: true,
          verified_by: user.id                 
      });

      if (scoreError) throw scoreError;

      await supabase.from('memberships').update({ has_submitted_current_round: true })
        .match({ user_id: manualEntryPlayer.membershipUuid, course_id: course.id });

      setManualEntryPlayer(null);
      loadTournamentData();
    } catch (err: any) { alert(err.message); } finally { setIsSubmittingManual(false); }
  }

  const confirmStartNewRound = async () => {
    if (!course?.id) return;
    setIsGlobalUpdating(true)
    try {
      const nextWeek = currentWeek + 1;
      const { data: nextSched } = await supabase.from('schedule').select('*').eq('course_id', course.id).eq('week_number', nextWeek).single();
      if (!nextSched) throw new Error("No schedule found for Week " + nextWeek);

      let h = 18; let s = 'All';
      if (nextSched.course_nine === 'Front 9') { h = 9; s = 'Front'; } 
      else if (nextSched.course_nine === 'Back 9') { h = 9; s = 'Back'; }

      const { data: gType } = await supabase.from('game_types').select('id').eq('name', nextSched.game_name).single();

      await supabase.from('league_settings').update({ 
        current_week: nextWeek, holes_to_play: h, tee_color: nextSched.tee_color, side_to_play: s,
        game_type: nextSched.game_name, game_type_id: gType?.id || null
      }).eq('course_id', course.id);
      
      await supabase.from('memberships').update({ has_submitted_current_round: false, is_checked_in: false }).eq('course_id', course.id);

      setCurrentWeek(nextWeek); setViewingWeek(nextWeek); setShowModal(false); loadTournamentData();
    } catch (err: any) { alert(err.message); } finally { setIsGlobalUpdating(false); }
  }

  if (viewState === 'checking' || authLoading) return <div style={styles.loader}>Verifying Admin...</div>

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Clubhouse Admin" 
        subtitle={`WEEK ${viewingWeek} ${viewingWeek !== currentWeek ? "(HISTORY)" : "LIVE"}`}
        rightElement={
          <select value={viewingWeek} onChange={(e) => setViewingWeek(Number(e.target.value))} style={styles.weekSelect}>
            {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        }
      />

      <div style={styles.adminControlBar}>
        <button onClick={() => setShowModal(true)} disabled={isGlobalUpdating || viewingWeek !== currentWeek} style={styles.newRoundBtn}>
          {isGlobalUpdating ? 'Syncing...' : `Advance to Week ${currentWeek + 1}`}
        </button>
      </div>

      <input type="text" placeholder="Search roster..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />

      {['A', 'B', 'C', 'D'].map((flightLabel) => {
        const flightMembers = members.filter(m => m.flight === flightLabel && m.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (flightMembers.length === 0) return null;

        return (
          <div key={flightLabel} style={styles.flightSection}>
            <div style={styles.flightHeader}><h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Flight {flightLabel}</h2></div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '10%' }}>Actions</th>
                    <th style={{ ...styles.th, width: '23%' }}>Player</th>
                    <th style={{ ...styles.th, width: '15%' }}>Partner</th>
                    <th style={{ ...styles.th, width: '12%' }}>Check-In</th>
                    <th style={{ ...styles.th, width: '10%' }}>Status</th>
                    <th style={{ ...styles.th, width: '10%' }}>Result</th>
                    <th style={{ ...styles.th, width: '15%', textAlign: 'center' }}>Winnings</th> 
                  </tr>
                </thead>
                <tbody>
                  {flightMembers.map((m) => (
                    <React.Fragment key={m.membershipUuid}>
                      <tr style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {viewingWeek === currentWeek && m.has_submitted_current_round && (
                                <button onClick={() => handleResetScorecard(m.membershipUuid, m.id)} style={styles.resetBtn}>Reset</button>
                            )}
                            {viewingWeek === currentWeek && !m.has_submitted_current_round && (
                                <button onClick={() => {setManualEntryPlayer(m); setManualScores(new Array(18).fill(0))}} style={styles.manualEntryBtn}>Paper</button>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <strong>{m.display_name}</strong>
                          <div style={{ fontSize: '11px', color: '#666' }}>HCP: {m.handicap_index}</div>
                        </td>
                        <td style={styles.td}>
                          <select value={m.partner_id || ""} onChange={(e) => handlePairing(m.id, e.target.value || null)} style={styles.pairingSelect} disabled={viewingWeek !== currentWeek}>
                            <option value="">-- No Partner --</option>
                            {members.filter(p => p.id !== m.id).map(p => (<option key={p.id} value={p.id}>{p.display_name}</option>))}
                          </select>
                        </td>
                        <td style={styles.td}>
                          {m.has_submitted_current_round ? <span style={styles.badgeFinished}>Done</span> : (
                            <button onClick={() => toggleCheckIn(m.membershipUuid, m.is_checked_in)} style={m.is_checked_in ? styles.checkedBtn : styles.uncheckedBtn}>
                              {m.is_checked_in ? 'In' : 'Out'}
                            </button>
                          )}
                        </td>
                        <td style={styles.td}>
                           <span style={m.detailedStatus === 'Finished' ? styles.badgeDone : styles.badgeActive}>{m.detailedStatus}</span>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => setExpandedPlayerUuid(expandedPlayerUuid === m.membershipUuid ? null : m.membershipUuid)} style={styles.netScoreBtn}>
                            {m.weekScore ? calculateTournamentResult({...m.weekScore, handicap_index: m.handicap_index}, null, activeGameType, course) : '--'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          {m.weekScore && (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ position: 'absolute', left: '5px', color: '#eecb33', fontWeight: 'bold' }}>$</span>
                              <input id={`win-${m.weekScore.id}`} type="text" inputMode="numeric" defaultValue={m.weekScore.winnings ? Number(m.weekScore.winnings).toFixed(2) : ''}
                                onBlur={(e) => handleWinningsChange(m.weekScore.id, e.target.value)}
                                style={styles.tableWinningsInput}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedPlayerUuid === m.membershipUuid && m.weekScore?.hole_scores && (
                        <tr>
                          <td colSpan={7} style={styles.expandedRow}>
                            <div style={styles.miniScorecard}>
                              {m.weekScore.hole_scores.map((gross: number, idx: number) => {
                                const holeNum = idx + 1;
                                if (gross === 0) return null;
                                if (m.weekScore.holes_played === 9 && m.weekScore.side_played === 'Back' && holeNum <= 9) return null;
                                if (m.weekScore.holes_played === 9 && m.weekScore.side_played === 'Front' && holeNum > 9) return null;
                                return (
                                  <div key={idx} style={styles.holeBox}><div style={{fontSize: '9px'}}>H{holeNum}</div><strong>{gross}</strong></div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {manualEntryPlayer && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, maxWidth: '650px'}}>
            <h2 style={styles.modalTitle}>Paper Card: {manualEntryPlayer.display_name}</h2>
            <p style={{fontSize: '11px', color: '#666', marginBottom: '10px'}}>{roundSettings.holes} Holes • {roundSettings.side} Side</p>
            <div style={styles.manualScoreGrid}>
              {(roundSettings.holes === 18 || roundSettings.side === 'Front') && (
                <div style={{marginBottom: '15px'}}>
                  <p style={styles.gridSubtitle}>Front 9</p>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center'}}>
                    {new Array(9).fill(0).map((_, i) => (
                        <div key={i}><div style={{fontSize: '10px', textAlign: 'center'}}>H{i+1}</div><input type="number" style={styles.manualInput} value={manualScores[i] || ''} onChange={(e) => { const s = [...manualScores]; s[i] = parseInt(e.target.value) || 0; setManualScores(s); }} /></div>
                    ))}
                  </div>
                </div>
              )}
              {(roundSettings.holes === 18 || roundSettings.side === 'Back') && (
                <div>
                  <p style={styles.gridSubtitle}>Back 9</p>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center'}}>
                    {new Array(9).fill(0).map((_, i) => (
                        <div key={i+9}><div style={{fontSize: '10px', textAlign: 'center'}}>H{i+10}</div><input type="number" style={styles.manualInput} value={manualScores[i+9] || ''} onChange={(e) => { const s = [...manualScores]; s[i+9] = parseInt(e.target.value) || 0; setManualScores(s); }} /></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setManualEntryPlayer(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={submitManualScore} style={styles.confirmBtn} disabled={isSubmittingManual}>Save Score</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Advance Week</h2>
            <p>Sync format and tees from your clubhouse schedule for Week {currentWeek + 1}?</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmStartNewRound} style={styles.confirmBtn}>Confirm & Sync</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  loader: { padding: '100px 20px', textAlign: 'center' },
  adminControlBar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' },
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #bbb', fontSize: '16px', color: '#000', backgroundColor: '#fff', marginBottom: '20px' },
  newRoundBtn: { background: '#eecb33', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  flightSection: { marginBottom: '40px' },
  flightHeader: { background: '#1a1a1a', padding: '10px 15px', borderRadius: '8px 8px 0 0' },
  tableWrapper: { background: '#fff', borderRadius: '0 0 8px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#000', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold' },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'middle' },
  tr: { borderBottom: '1px solid #eee' },
  uncheckedBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  checkedBtn: { padding: '6px 12px', background: '#f5f5e8', border: '1px solid #eecb33', color: '#b0951e', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgeDone: { color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgeActive: { color: '#eecb33', fontSize: '11px', fontWeight: 'bold' },
  resetBtn: { padding: '6px 10px', background: '#fff', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  manualEntryBtn: { padding: '6px 10px', background: '#f5f5e8', border: '1px solid #eecb33', color: '#eecb33', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  badgeFinished: { padding: '6px 12px', background: '#e9ecef', color: '#000', borderRadius: '4px', fontSize: '11px', border: '1px solid #ccc'},
  weekSelect: { padding: '8px 12px', borderRadius: '6px', background: '#333', color: '#fff', fontWeight: 'bold' },
  netScoreBtn: { background: 'none', border: 'none', color: '#eecb33', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: 'auto' },
  modalTitle: { marginTop: 0, fontSize: '24px', marginBottom: '15px' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  confirmBtn: { flex: 2, padding: '12px', background: '#eecb33', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' },
  tableWinningsInput: { width: '90px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #f5f5e8', fontSize: '13px', textAlign: 'right' },
  expandedRow: { backgroundColor: '#f5f4e8', padding: '15px' },
  miniScorecard: { display: 'flex', gap: '8px', overflowX: 'auto' },
  holeBox: { background: '#fff', border: '1px solid #bbb', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', minWidth: '40px' },
  pairingSelect: { width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #bbb', fontSize: '11px' },
  manualScoreGrid: { background: '#f8f9fa', padding: '20px', borderRadius: '8px' },
  manualInput: { width: '45px', padding: '10px 0', textAlign: 'center', border: '1px solid #bbb', borderRadius: '4px', fontSize: '16px' },
  gridSubtitle: { fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#eecb33' }
};