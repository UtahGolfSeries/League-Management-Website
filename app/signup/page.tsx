'use client'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../components/pageHeader'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signup } = useAuth()
  const router = useRouter()

  // NEW: Phone Number Formatter Logic
  const formatPhoneNumber = (value: string) => {
    // 1. Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // 2. Limit to 10 digits
    const limited = digits.slice(0, 10);
    
    // 3. Apply the mask: 123-456-7890
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password, displayName, phoneNumber, ghinNumber)
      router.push('/account')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <PageHeader title="Join the League" subtitle="CREATE YOUR PLAYER PROFILE" />

      <div style={styles.card}>
        <form onSubmit={handleSignup}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text" placeholder="e.g. John Smith"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input} required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email" placeholder="golf@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={styles.input} required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Phone <span style={styles.optional}>(Optional)</span></label>
              <input
                type="tel"
                placeholder="555-555-5555"
                value={phoneNumber}
                onChange={handlePhoneChange} // Uses the new formatter
                style={styles.input}
                maxLength={12} // Accommodates 10 digits + 2 dashes
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>GHIN # <span style={styles.optional}>(Optional)</span></label>
              <input
                type="text" placeholder="1234567"
                value={ghinNumber} onChange={(e) => setGhinNumber(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password" placeholder="Minimum 6 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={styles.input} required
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.signupBtn}>
            {loading ? 'Creating Account...' : 'Create Player Profile'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  card: { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
  row: { display: 'flex', gap: '15px' },
  inputGroup: { marginBottom: '20px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: '8px' },
  optional: { color: '#bbb', fontWeight: 'normal' as const, textTransform: 'none' as const },
  input: { width: '100%', padding: '12px', fontSize: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' as const, color: '#000', outlineColor: '#eecb33', backgroundColor: '#fdfdfd' },
  signupBtn: { width: '100%', padding: '14px', background: '#eecb33', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, fontSize: '16px', cursor: 'pointer' as const, marginTop: '10px' },
  errorText: { color: '#d32f2f', fontSize: '13px', textAlign: 'center' as const, marginBottom: '15px' },
  footer: { marginTop: '25px', textAlign: 'center' as const },
  footerText: { fontSize: '14px', color: '#666' },
  link: { color: '#eecb33', fontWeight: 'bold' as const, textDecoration: 'none' }
}