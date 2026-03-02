'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TEES = ["White", "Blue", "Black", "Red"];
const NINES = ["Front 9", "Back 9", "Full 18"];

export default function AdminSchedule() {
  const { user, loading: authLoading } = useAuth()
  const [schedule, setSchedule] = useState<any[]>([])
  const [gameTypes, setGameTypes] = useState<any[]>([])
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchInitialData = async () => {
    // 1. Determine the Admin's Course first
    const userUuid = user?.auth_user_id || user?.id;
    if (!userUuid) return;

    try {
      const { data: membership } = await supabase
        .from('memberships')
        .select('course_id')
        .eq('user_id', userUuid)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      setActiveCourseId(membership.course_id);

      // 2. Fetch the schedule for THIS course and general game types
      const [schedRes, gameRes] = await Promise.all([
        supabase.from('schedule')
          .select('*')
          .eq('course_id', membership.course_id) // Filter by Course
          .order('week_number', { ascending: true }),
        supabase.from('game_types').select('id, name')
      ])

      if (schedRes.data) setSchedule(schedRes.data)
      if (gameRes.data) setGameTypes(gameRes.data)
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) fetchInitialData()
  }, [user, authLoading])

  const startEdit = (week: any) => {
    setEditingId(week.id)
    setEditData(week)
  }

  const saveEdit = async () => {
    const { error } = await supabase
      .from('schedule')
      .update({
        game_name: editData.game_name,
        tee_color: editData.tee_color,
        course_nine: editData.course_nine,
        week_date: editData.week_date
      })
      .eq('id', editingId)
      .eq('course_id', activeCourseId) // Security match

    if (!error) {
      setEditingId(null)
      fetchInitialData()
    }
  }

  const addWeek = async () => {
    if (!activeCourseId) return;
    setIsProcessing(true)
    const nextWeekNum = schedule.length > 0 ? schedule[schedule.length - 1].week_number + 1 : 1;
    
    const { error } = await supabase.from('schedule').insert({
      course_id: activeCourseId, // Link new week to this course
      week_number: nextWeekNum,
      game_name: "Individual Stroke Play",
      course_nine: "Front 9",
      tee_color: "White"
    })

    if (!error) await fetchInitialData()
    setIsProcessing(false)
  }

  const removeLastWeek = async () => {
    if (schedule.length === 0 || !activeCourseId) return;
    if (!window.confirm(`Delete Week ${schedule.length}?`)) return;

    setIsProcessing(true)
    const lastId = schedule[schedule.length - 1].id;
    const { error } = await supabase.from('schedule')
      .delete()
      .eq('id', lastId)
      .eq('course_id', activeCourseId); // Security match

    if (!error) await fetchInitialData()
    setIsProcessing(false)
  }

  if (loading || authLoading) return <div style={styles.loader}>Accessing Clubhouse Schedule...</div>

  if (!activeCourseId) return <div style={styles.loader}>No Clubhouse Association Found.</div>

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Manage Schedule" 
        subtitle="SET SEASON GAMES & PARAMETERS" 
        rightElement={
          <div style={{display: 'flex', gap: '10px'}}>
             <button onClick={removeLastWeek} disabled={isProcessing} style={styles.removeWeekBtn}>- Remove Week</button>
             <button onClick={addWeek} disabled={isProcessing} style={styles.addWeekBtn}>+ Add Week</button>
          </div>
        }
      />

      <div style={styles.list}>
        {schedule.map((wk) => (
          <div key={wk.id} style={styles.card}>
            <div style={styles.weekNum}>WEEK {wk.week_number}</div>
            
            {editingId === wk.id ? (
              <div style={styles.editContainer}>
                <div style={styles.editGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Date</label>
                    <input 
                      type="date" 
                      style={styles.input}
                      value={editData.week_date || ""}
                      onChange={e => setEditData({...editData, week_date: e.target.value})}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Format</label>
                    <select 
                      style={styles.select} 
                      value={editData.game_name} 
                      onChange={e => setEditData({...editData, game_name: e.target.value})}
                    >
                      {gameTypes.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Section</label>
                    <select 
                      style={styles.select} 
                      value={editData.course_nine} 
                      onChange={e => setEditData({...editData, course_nine: e.target.value})}
                    >
                      {NINES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tees</label>
                    <select 
                      style={styles.select} 
                      value={editData.tee_color} 
                      onChange={e => setEditData({...editData, tee_color: e.target.value})}
                    >
                      {TEES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button onClick={saveEdit} style={styles.saveBtn}>Save Changes</button>
                  <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.displayRow}>
                <div style={styles.info}>
                  <div style={styles.dateLabel}>{wk.week_date ? new Date(wk.week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'}</div>
                  <div style={styles.gameTitle}>{wk.game_name}</div>
                  <div style={styles.details}>{wk.course_nine} • {wk.tee_color} Tees</div>
                </div>
                <button onClick={() => startEdit(wk)} style={styles.editBtn}>Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  loader: { textAlign: 'center' as const, padding: '50px', color: '#000' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  card: { background: '#fff', border: '1px solid #ddd', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: '100px' },
  weekNum: { background: '#000', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' as const, minWidth: '45px', textAlign: 'center' as const, marginTop: '5px' },
  displayRow: { display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  dateLabel: { fontSize: '12px', fontWeight: 'bold' as const, color: '#eecb33', textTransform: 'uppercase' as const, marginBottom: '2px' },
  gameTitle: { fontWeight: '900' as const, fontSize: '18px', color: '#000' },
  details: { fontSize: '13px', color: '#444', fontWeight: 'bold' as const },
  editBtn: { background: '#f5f5f5', border: '1px solid #ddd', color: '#000', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' as const },
  addWeekBtn: { background: '#eecb33', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '12px' },
  removeWeekBtn: { background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '12px' },
  editContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  editGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', width: '100%' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#666', textTransform: 'uppercase' as const },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #000', fontSize: '13px', color: '#000', backgroundColor: '#fff', width: '100%' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #000', fontSize: '13px', color: '#000', backgroundColor: '#fff', width: '100%' },
  actions: { display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px', justifyContent: 'flex-end' },
  saveBtn: { background: '#eecb33', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '13px' },
  cancelBtn: { background: '#fff', border: '1px solid #000', color: '#000', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '13px' }
}