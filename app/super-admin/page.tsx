'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../context/AuthContext'

interface Course {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  par_values?: number[];
  handicap_values?: number[];
  subscriptions?: { 
    plan_name: string;
    amount_decimal: number;
  } | null; 
}

export default function SuperAdminPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [courseName, setCourseName] = useState('')
  const [courseSlug, setCourseSlug] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Subscription Modal States
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [planAmount, setPlanAmount] = useState('99.00')
  const [planName, setPlanName] = useState('Pro Association')

  // Admin Modal States
  const [adminModalCourse, setAdminModalCourse] = useState<Course | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // NEW: Course Scorecard Modal States
  const [configCourse, setConfigCourse] = useState<Course | null>(null)
  const [tempPars, setTempPars] = useState<number[]>(new Array(18).fill(4))
  const [tempHandicaps, setTempHandicaps] = useState<number[]>(new Array(18).fill(1))

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        slug,
        created_at,
        par_values,
        handicap_values,
        subscriptions (
          plan_name,
          amount_decimal,
          status,
          next_billing_date
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch Error:", error.message);
    } else if (data) {
      setCourses(data as unknown as Course[]);
    }
    setLoading(false);
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `CRITICAL: Are you sure you want to delete ${name.toUpperCase()}?\n\nThis will permanently remove all associated members, subscriptions, and league data. This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      setCourses(prev => prev.filter(course => course.id !== id));
      alert(`${name} has been removed.`);
    } catch (err: any) {
      alert("Error deleting course: " + err.message);
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const { error } = await supabase.from('courses').insert([{ 
        name: courseName, 
        slug: courseSlug.toLowerCase().trim().replace(/\s+/g, '-'),
        par_values: Array(18).fill(4), 
        handicap_values: Array(18).fill(1)
      }])

      if (error) throw error;

      setCourseName(''); 
      setCourseSlug('');
      await fetchCourses(); // Refresh list so the new course appears
      alert("Clubhouse Provisioned!");
    } catch (err: any) {
      alert("Provisioning Error: " + err.message);
    } finally {
      setFormLoading(false);
    }
  }

  // NEW: Update Course Scoring Configuration
  const handleUpdateCourseConfig = async () => {
    if (!configCourse) return
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          par_values: tempPars,
          handicap_values: tempHandicaps
        })
        .eq('id', configCourse.id)

      if (error) throw error

      // CRITICAL: We must refetch to update the local 'courses' state 
      // so when you open it again, it shows the saved numbers.
      await fetchCourses() 
      
      alert("Scoring configuration saved!");
      setConfigCourse(null); // Close modal
    } catch (err: any) {
      alert("Save failed: " + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateSubscription = async () => {
    if (!selectedCourse) return
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          course_id: selectedCourse.id,
          plan_name: planName,
          amount_decimal: parseFloat(planAmount),
          status: 'active'
        }, { onConflict: 'course_id' })

      if (error) throw error
      alert("Plan updated successfully!")
      setSelectedCourse(null)
      await fetchCourses()
    } catch (err: any) {
      alert("Update failed: " + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminModalCourse) return
    setAdminLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(adminEmail)
      if (authError) throw authError
      const userId = authData.user?.id

      await supabase.from('member').upsert({
        auth_user_id: userId,
        display_name: adminName,
        email: adminEmail,
        role: 'player' 
      }, { onConflict: 'email' })

      await supabase.from('memberships').insert({
        user_id: userId,
        course_id: adminModalCourse.id,
        role: 'admin' 
      })

      alert(`Invitation sent to ${adminEmail}!`)
      setAdminModalCourse(null)
      setAdminEmail(''); setAdminName('')
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <>
      <header style={styles.mainHeader}>
        <h1 style={styles.pageTitle}>Course Management</h1>
        <p style={styles.subtitle}>Provision clubhouse tenants and manage billing tiers.</p>
      </header>

      <div style={styles.contentGrid}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Provision New Course</h3>
          <form onSubmit={handleCreateCourse} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Course Name</label>
              <input style={styles.input} value={courseName} onChange={(e) => {
                setCourseName(e.target.value)
                setCourseSlug(e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'))
              }} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Unique Slug</label>
              <input style={styles.input} value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} required />
            </div>
            <button type="submit" disabled={formLoading} style={styles.submitBtn}>
              {formLoading ? 'Provisioning...' : 'Create Course & Link'}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Active Clubhouse Tenants</h3>
          {loading ? <p>Loading...</p> : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Course / Slug</th>
                  <th style={styles.th}>Plan</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{course.name}</strong>
                      <div style={styles.slugSubtext}>/signup?c={course.slug}</div>
                    </td>
                    <td style={styles.td}>
                      {course.subscriptions ? (
                        <>
                          <div style={styles.planBadge}>{course.subscriptions.plan_name}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', color: '#666' }}>
                            ${Number(course.subscriptions.amount_decimal || 0).toFixed(2)}/mo
                          </div>
                        </>
                      ) : (
                        <div style={{ ...styles.planBadge, background: '#fee2e2', color: '#b91c1c' }}>
                          PENDING SETUP
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionRow}>
                        <button onClick={() => {
                          setSelectedCourse(course)
                          setPlanName(course.subscriptions?.plan_name || 'Pro Association')
                          setPlanAmount(course.subscriptions?.amount_decimal?.toString() || '99.00')
                        }} style={styles.manageBtn}>Manage Sub</button>

                        {/* NEW: Config Button */}
                        <button onClick={() => {
                          setConfigCourse(course)
                          setTempPars(course.par_values || new Array(18).fill(4))
                          setTempHandicaps(course.handicap_values || new Array(18).fill(1))
                        }} style={styles.configBtn}>Config Scorecard</button>

                        <button onClick={() => setAdminModalCourse(course)} style={styles.addAdminBtn}>+ Add Admin</button>
                        <button onClick={() => handleDeleteCourse(course.id, course.name)} style={styles.deleteBtn}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* MODAL: COURSE SCORECARD CONFIGURATION */}
{configCourse && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: '950px', maxWidth: '95%' }}>
      <h2 style={{ color: '#1a1a1a', marginBottom: '5px' }}>Scorecard: {configCourse.name}</h2>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Define hole Pars and Handicap Stroke Index (1-18).</p>
      
      <div style={styles.scorecardGrid}>
        {/* HEADER ROW with Spacer */}
        <div style={styles.gridRow}>
          <div style={{ ...styles.gridLabel, background: '#1a1a1a', borderRight: '1px solid #333' }}>Hole</div>
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} style={styles.gridHeader}>{i + 1}</div>
          ))}
        </div>

        {/* PAR ROW */}
        <div style={styles.gridRow}>
          <div style={styles.gridLabel}>Par</div>
          {tempPars.map((p, i) => (
            <div key={i} style={{ flex: 1, display: 'flex' }}>
              <input type="number" style={styles.gridInput} value={p} onChange={(e) => {
                const next = [...tempPars]; next[i] = parseInt(e.target.value) || 0; setTempPars(next);
              }} />
            </div>
          ))}
        </div>

        {/* HCP ROW */}
        <div style={styles.gridRow}>
          <div style={styles.gridLabel}>HCP</div>
          {tempHandicaps.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex' }}>
              <input key={i} type="number" style={styles.gridInput} value={h} onChange={(e) => {
                const next = [...tempHandicaps]; next[i] = parseInt(e.target.value) || 0; setTempHandicaps(next);
              }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
        <button onClick={() => setConfigCourse(null)} style={styles.cancelBtn}>Cancel</button>
        <button onClick={handleUpdateCourseConfig} style={styles.submitBtn} disabled={formLoading}>
          {formLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* MODAL: SUBSCRIPTION (Keeping original) */}
      {selectedCourse && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: '#1a1a1a', marginBottom: '10px' }}>Billing: {selectedCourse.name}</h2>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Subscription Plan</label>
              <select style={styles.input} value={planName} onChange={(e) => setPlanName(e.target.value)}>
                <option value="Basic League">Basic League</option>
                <option value="Pro Association">Pro Association</option>
                <option value="Elite Clubhouse">Elite Clubhouse</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Monthly Rate ($)</label>
              <input style={styles.input} type="number" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setSelectedCourse(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleUpdateSubscription} style={styles.submitBtn} disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Update Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADMIN (Keeping original) */}
      {adminModalCourse && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: '#1a1a1a', marginBottom: '5px' }}>Invite Clubhouse Admin</h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Send an invitation to <strong>{adminModalCourse.name}</strong>.</p>
            <form onSubmit={handleCreateAdmin}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input style={styles.input} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Smith" required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input style={styles.input} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@course.com" required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setAdminModalCourse(null)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={adminLoading} style={styles.submitBtn}>
                  {adminLoading ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// STYLES (Keeping original and adding grid styles)
const styles = {
  mainHeader: { marginBottom: '30px' },
  pageTitle: { fontSize: '28px', color: '#1a1a1a', margin: 0, fontWeight: '900' as const },
  subtitle: { color: '#333', marginTop: '5px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' },
  card: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  cardTitle: { marginBottom: '20px', fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#1a1a1a' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #bbb', fontSize: '15px', color: '#1a1a1a' },
  submitBtn: { padding: '14px', background: '#eecb33', color: '#1a1a1a', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableHeader: { backgroundColor: '#1a1a1a' },
  th: { padding: '12px', fontSize: '11px', color: '#fff', textTransform: 'uppercase' as const, fontWeight: '700' as const, textAlign: 'left' as const },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '15px 12px', fontSize: '14px', color: '#1a1a1a', verticalAlign: 'middle' as const },
  slugSubtext: { fontSize: '11px', color: '#666' },
  planBadge: { padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' as const },
  actionRow: { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' },
  manageBtn: { padding: '6px 12px', background: '#eecb33', color: '#1a1a1a', border: 'none', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' as const },
  configBtn: { padding: '6px 12px', background: '#f5f5f5', color: '#1a1a1a', border: '1px solid #ddd', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' as const },
  addAdminBtn: { padding: '6px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' as const },
  deleteBtn: { padding: '6px 10px', background: '#fff', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: '40px', borderRadius: '24px', width: '450px' },
  cancelBtn: { flex: 1, padding: '14px', background: '#eee', borderRadius: '8px', cursor: 'pointer', border: 'none', color: '#1a1a1a', fontWeight: 'bold' as const },
  
  // Grid Styles for Scorecard Configuration
  scorecardGrid: { display: 'flex', flexDirection: 'column' as const, background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' },
  gridRow: { display: 'flex', borderBottom: '1px solid #eee' },
  gridHeader: { flex: 1, padding: '10px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 'bold' as const, background: '#1a1a1a', color: '#fff', minWidth: '35px' },
  gridLabel: { width: '80px', padding: '10px', background: '#eee', fontSize: '11px', fontWeight: 'bold' as const, display: 'flex', alignItems: 'center' as const },
  gridInput: { flex: 1, padding: '10px', border: 'none', borderRight: '1px solid #eee', textAlign: 'center' as const, fontSize: '13px', width: '100%', minWidth: '35px', outlineColor: '#eecb33' }
}