'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'

export default function BillingPage() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        courses:course_id ( name )
      `)
      .order('created_at', { ascending: false })
    
    if (data) setSubs(data)
    setLoading(false)
  }

  // Helper to format date safely and calculate urgency
  const getBillingDetails = (dateString: string) => {
    if (!dateString) return { formatted: 'Not Set', daysLeft: 0, color: '#999' }
    
    // Use the middle of the day to avoid timezone "flip-over" shifts
    const targetDate = new Date(dateString + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let color = '#2e7d32'; // Green (Safe)
    if (daysLeft <= 0) color = '#d32f2f'; // Red (Overdue)
    else if (daysLeft <= 7) color = '#ed6c02'; // Orange (Upcoming)

    return {
      formatted: targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      daysLeft,
      color
    };
  }

  const totalMRR = subs.reduce((sum, s) => sum + Number(s.amount_decimal || 0), 0)

  if (loading) return <div style={styles.container}>Loading Revenue Data...</div>

  return (
    <div style={styles.container}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={styles.pageTitle}>Platform Revenue</h1>
        <p style={{ color: '#666', marginTop: '-20px' }}>Real-time MRR and invoice tracking for clubhouse tenants.</p>
      </header>
      
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Monthly Recurring Revenue</span>
          <p style={styles.statValue}>${totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Active Clubhouse Tenants</span>
          <p style={styles.statValue}>{subs.length}</p>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Clubhouse / Course</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Monthly Amount</th>
              <th style={styles.th}>Next Invoice</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {subs.length > 0 ? subs.map(sub => {
              const billing = getBillingDetails(sub.next_billing_date);
              return (
                <tr key={sub.id} style={styles.tr}>
                  <td style={styles.td}>
                      <strong style={{ color: '#1a1a1a' }}>{sub.courses?.name || 'Unknown'}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.planText}>{sub.plan_name}</span>
                  </td>
                  <td style={styles.td}>
                    <strong style={{ color: '#1a1a1a' }}>${Number(sub.amount_decimal).toFixed(2)}</strong>
                  </td>
                  <td style={styles.td}>
                    <div style={{ color: billing.color, fontWeight: 'bold' }}>
                      {billing.formatted}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      {billing.daysLeft < 0 
                        ? `${Math.abs(billing.daysLeft)} days overdue` 
                        : `${billing.daysLeft} days remaining`}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={sub.status === 'active' ? styles.statusActive : styles.statusPending}>
                      {sub.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '40px' }}>
                  No active subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  pageTitle: { fontSize: '32px', color: '#1a1a1a', marginBottom: '30px', fontWeight: '900' as const },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '40px' },
  statCard: { flex: 1, background: '#1a1a1a', padding: '30px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
  statLabel: { color: '#888', fontSize: '12px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, marginBottom: '10px', display: 'block', letterSpacing: '1px' },
  statValue: { fontSize: '36px', fontWeight: '900' as const, color: '#eecb33', margin: 0 },
  tableWrapper: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableHeader: { backgroundColor: '#1a1a1a' },
  th: { textAlign: 'left' as const, padding: '18px 15px', color: '#fff', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  tr: { transition: 'background 0.2s' },
  td: { padding: '20px 15px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#1a1a1a' },
  planText: { background: '#f5f7f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' as const },
  statusActive: { color: '#2e7d32', fontWeight: 'bold' as const, fontSize: '11px', background: '#e8f5e9', padding: '4px 10px', borderRadius: '20px' },
  statusPending: { color: '#ed6c02', fontWeight: 'bold' as const, fontSize: '11px', background: '#fff3e0', padding: '4px 10px', borderRadius: '20px' }
}