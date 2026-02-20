'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import PageHeader from '../../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RosterManagement() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Wallet State
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [rawAmount, setRawAmount] = useState('0') // Stores the digits only
  const [transactionDesc, setTransactionDesc] = useState('')
  const [modalBalance, setModalBalance] = useState(0)
  const [transactionHistory, setTransactionHistory] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/')
    }
  }, [user, authLoading, router])

  const fetchRoster = async () => {
    setLoading(true)
    try {
      const { data: roster } = await supabase
        .from('member')
        .select('*')
        .neq('role', 'admin')
        .order('display_name', { ascending: true })

      const { data: allScores } = await supabase.from('scorecards').select('member_id, winnings')
      const { data: allTrans } = await supabase.from('clubhouse_transactions').select('member_id, amount')

      if (roster) {
        const processed = roster.map(m => {
          const totalWins = allScores?.filter(s => s.member_id === m.id).reduce((sum, s) => sum + (Number(s.winnings) || 0), 0) || 0
          const totalSpent = allTrans?.filter(t => t.member_id === m.id).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0
          return { ...m, balance: totalWins + totalSpent }
        })
        setMembers(processed)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoster()
  }, [])

  const handleUpdate = async (id: string, updates: any) => {
    setUpdatingId(id)
    const { error } = await supabase.from('member').update(updates).eq('id', id)
    if (error) alert("Update failed: " + error.message)
    setUpdatingId(null)
  }

  const openWallet = async (member: any) => {
    setSelectedMember(member)
    setModalBalance(member.balance)
    setRawAmount('0') // Reset amount on open
    
    const { data: history, error } = await supabase
      .from('clubhouse_transactions')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })

    if (!error) setTransactionHistory(history || [])
  }

  // NEW: Currency Mask Logic
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digits
    const digits = e.target.value.replace(/\D/g, '');
    // If user deletes everything, reset to 0
    if (digits === '') {
      setRawAmount('0');
      return;
    }
    // Prevent leading zeros unless the total is 0
    setRawAmount(parseInt(digits).toString());
  };

  // Format raw digits (cents) to dollars for display
  const formatCurrency = (amount: string) => {
    const totalCents = parseInt(amount);
    return (totalCents / 100).toFixed(2);
  };

  const handleCharge = async () => {
    const finalAmount = parseFloat(formatCurrency(rawAmount));
    if (finalAmount <= 0 || !selectedMember) return;

    const { error } = await supabase.from('clubhouse_transactions').insert({
      member_id: selectedMember.id,
      amount: -Math.abs(finalAmount),
      description: transactionDesc || "Clubhouse Purchase"
    })

    if (!error) {
      alert("Charge successful!");
      setSelectedMember(null);
      setRawAmount('0');
      setTransactionDesc('');
      fetchRoster();
    }
  }

  const deleteTransaction = async (transId: string) => {
    if (!window.confirm("Delete this transaction?")) return
    const { error } = await supabase.from('clubhouse_transactions').delete().eq('id', transId)
    if (!error) {
      const { data: history } = await supabase
        .from('clubhouse_transactions')
        .select('*')
        .eq('member_id', selectedMember.id)
        .order('created_at', { ascending: false })
      setTransactionHistory(history || [])
      fetchRoster()
    }
  }

  const filteredMembers = members.filter(m => 
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || authLoading) return <div style={styles.loader}>Loading Roster...</div>

  return (
    <div style={styles.container}>
      <PageHeader title="Roster Management" subtitle="Manage member accounts and credit balances." />

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text" placeholder="Search for a player..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '25%', textAlign: 'left'}}>Name</th>
              <th style={{...styles.th, width: '15%', textAlign: 'left'}}>Handicap</th>
              <th style={{...styles.th, width: '15%', textAlign: 'left'}}>Flight</th>
              <th style={{...styles.th, width: '30%', textAlign: 'center'}}>Credit Balance</th>
              <th style={{...styles.th, width: '15%', textAlign: 'center'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}><strong style={{ color: '#000' }}>{m.display_name}</strong></td>
                <td style={styles.td}>
                  <input 
                    type="number" step="0.1" defaultValue={m.handicap_index}
                    onBlur={(e) => handleUpdate(m.id, { handicap_index: parseFloat(e.target.value) })}
                    style={styles.inlineInput}
                  />
                </td>
                <td style={styles.td}>
                  <select 
                    defaultValue={m.flight || 'A'} 
                    onChange={(e) => handleUpdate(m.id, { flight: e.target.value })}
                    style={styles.inlineSelect}
                  >
                    <option value="A">Flight A</option>
                    <option value="B">Flight B</option>
                    <option value="C">Flight C</option>
                    <option value="D">Flight D</option>
                  </select>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <div style={styles.balanceContainer}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: m.balance < 0 ? '#d32f2f' : '#eecb33', minWidth: '70px' }}>
                      ${(m.balance || 0).toFixed(2)}
                    </span>
                    <button onClick={() => openWallet(m)} style={styles.walletBtn}>Transaction</button>
                  </div>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {updatingId === m.id ? 
                    <span style={{color: '#666', fontSize: '11px'}}>Saving...</span> : 
                    <span style={{color: '#eecb33', fontSize: '11px', fontWeight: 'bold'}}>Saved</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMember && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{color: '#000', marginTop: 0, fontSize: '20px'}}>Wallet: {selectedMember.display_name}</h2>
            
            <div style={styles.balanceDisplay}>
              <label style={styles.label}>Current Balance</label>
              <p style={{fontSize: '28px', fontWeight: 'bold', color: '#eecb33', margin: '5px 0 0 0'}}>
                ${(members.find(m => m.id === selectedMember.id)?.balance || 0).toFixed(2)}
              </p>
            </div>

            <div style={styles.historyContainer}>
              <label style={styles.label}>Recent Transactions</label>
              <div style={styles.historyList}>
                {transactionHistory.length === 0 ? (
                  <p style={{fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '10px'}}>No history.</p>
                ) : (
                  transactionHistory.map((t) => (
                    <div key={t.id} style={styles.historyItem}>
                      <div style={{flex: 1}}>
                        <div style={{fontSize: '13px', fontWeight: 'bold', color: '#000'}}>{t.description}</div>
                        <div style={{fontSize: '10px', color: '#999'}}>{new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{fontSize: '13px', fontWeight: 'bold', color: '#d32f2f'}}>-${Math.abs(t.amount).toFixed(2)}</span>
                        <button onClick={() => deleteTransaction(t.id)} style={styles.deleteBtn}>✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px'}}>
              <label style={styles.label}>New Clubhouse Charge</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '10px', fontWeight: 'bold', color: '#000' }}>$</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={formatCurrency(rawAmount)}
                  onChange={handleAmountChange}
                  style={{...styles.modalInput, paddingLeft: '25px', fontWeight: 'bold', fontSize: '18px'}} 
                />
              </div>
              <input 
                type="text" placeholder="Description (Optional)" value={transactionDesc}
                onChange={(e) => setTransactionDesc(e.target.value)}
                style={{...styles.modalInput, marginTop: '10px'}} 
              />
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setSelectedMember(null)} style={styles.cancelBtn}>Close</button>
              <button onClick={handleCharge} style={styles.chargeBtn}>Apply Charge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '950px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  loader: { padding: '100px 20px', textAlign: 'center' as const },
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #bbb', fontSize: '16px', backgroundColor: '#fff', color: '#000', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', outlineColor: '#eecb33' },
  tableWrapper: { background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#333', fontSize: '11px', textTransform: 'uppercase' as const, fontWeight: 'bold' as const },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px', verticalAlign: 'middle' as const },
  tr: { borderBottom: '1px solid #eee' },
  inlineInput: { width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid #bbb', fontSize: '14px', color: '#000', fontWeight: 'bold' as const },
  inlineSelect: { padding: '8px', borderRadius: '4px', border: '1px solid #bbb', fontSize: '14px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold' as const, cursor: 'pointer' as const },
  balanceContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  walletBtn: { background: '#f5f5e8', border: '1px solid #eecb33', color: '#eecb33', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' as const, fontSize: '12px', fontWeight: 'bold' as const },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '25px', borderRadius: '12px', width: '400px', maxWidth: '90%' },
  balanceDisplay: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', textAlign: 'center' as const, border: '1px solid #ddd', marginBottom: '15px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#888', textTransform: 'uppercase' as const, display: 'block' },
  historyContainer: { marginTop: '10px' },
  historyList: { maxHeight: '150px', overflowY: 'auto' as const, border: '1px solid #eee', borderRadius: '6px', padding: '5px' },
  historyItem: { display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f9f9f9', alignItems: 'center' },
  deleteBtn: { background: '#fff1f0', color: '#f5222d', border: '1px solid #ffa39e', borderRadius: '4px', cursor: 'pointer' as const, fontSize: '10px', padding: '2px 6px' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' as const, fontSize: '14px', color: '#000' },
  buttonRow: { display: 'flex', gap: '10px', marginTop: '20px' },
  chargeBtn: { flex: 2, padding: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' as const },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer' as const }
}