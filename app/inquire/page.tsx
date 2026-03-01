'use client'
import { useState } from 'react'
import PageHeader from '../components/pageHeader'

export default function InquirePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    courseName: '',
    playerCount: 'under-50',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send this to your 'leads' table in Supabase
    // or an email service like Resend/SendGrid
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={styles.successContainer}>
        <h2 style={{ fontSize: '32px', color: '#1a1a1a' }}>Message Received!</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Our team will reach out within 24 hours to schedule your demo.</p>
        <button onClick={() => window.location.href = '/'} style={styles.submitBtn}>Back to Home</button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <PageHeader title="Get LinkLogic Pro" subtitle="PROVISION YOUR CLUBHOUSE" />
      
      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Name</label>
            <input 
              style={styles.input} type="text" required 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={styles.row}>
            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}>Work Email</label>
              <input 
                style={styles.input} type="email" required 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}>Course Name</label>
              <input 
                style={styles.input} type="text" required 
                onChange={(e) => setFormData({...formData, courseName: e.target.value})}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Estimated Player Count</label>
            <select 
              style={styles.input}
              onChange={(e) => setFormData({...formData, playerCount: e.target.value})}
            >
              <option value="under-50">Under 50 Players</option>
              <option value="50-150">50 - 150 Players</option>
              <option value="150+">150+ Players</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Additional Details</label>
            <textarea 
              style={{...styles.input, height: '100px', resize: 'none'}} 
              placeholder="Tell us about your current league setup..."
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            />
          </div>

          <button type="submit" style={styles.submitBtn}>Request Platform Access</button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '40px 20px', maxWidth: '600px', margin: '0 auto' },
  successContainer: { textAlign: 'center' as const, padding: '100px 20px' },
  card: { background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #eee' },
  row: { display: 'flex', gap: '20px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '11px', fontWeight: 'bold' as const, color: '#aaa', textTransform: 'uppercase' as const, marginBottom: '8px', letterSpacing: '1px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', background: '#fdfdfd' },
  submitBtn: { width: '100%', padding: '16px', background: '#eecb33', color: '#1a1a1a', border: 'none', borderRadius: '10px', fontWeight: 'bold' as const, fontSize: '16px', cursor: 'pointer' }
}