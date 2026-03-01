'use client'
import { useState, useEffect } from 'react'
import { useAuth, supabase } from '../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../components/pageHeader'

interface CourseData {
  id: string;
  name: string;
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [courseInfo, setCourseInfo] = useState<CourseData | null>(null)
  const [fetchingCourse, setFetchingCourse] = useState(true)

  const { signup } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('c')

  useEffect(() => {
    const getCourse = async () => {
      // If there is no slug in the URL, we stop and show the error state
      if (!slug) {
        setFetchingCourse(false)
        return
      }

      try {
        // We use .maybeSingle() instead of .single() to prevent 
        // the query from crashing if the slug isn't found.
        const { data, error: fetchError } = await supabase
          .from('courses')
          .select('id, name')
          .eq('slug', slug.toLowerCase()) // Force lowercase comparison
          .maybeSingle()

        if (fetchError) throw fetchError
        
        if (data) {
          setCourseInfo(data)
        } else {
          console.error("No course found with slug:", slug)
        }
      } catch (err: any) {
        console.error("Verification error:", err.message)
      } finally {
        setFetchingCourse(false)
      }
    }
    getCourse()
  }, [slug])

  // Phone number mask (unchanged)
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
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
    
    if (!courseInfo) {
      setError('Invalid clubhouse link. Please request a new one from your admin.')
      return
    }

    setLoading(true)
    try {
      // Passes courseInfo.id to the AuthContext signup function
      await signup(email, password, displayName, phoneNumber, ghinNumber, courseInfo.id)
      router.push('/account')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingCourse) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#1a1a1a', fontWeight: 'bold' }}>Verifying Clubhouse...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <PageHeader 
        title={courseInfo ? `Join ${courseInfo.name}` : "Invalid Link"} 
        subtitle={courseInfo ? "OFFICIAL CLUBHOUSE REGISTRATION" : "ACCESS DENIED"} 
      />

      <div style={styles.card}>
        {/* If the slug is missing OR the database didn't find a matching course */}
        {!courseInfo ? (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⛳️</div>
            <p style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px' }}>Clubhouse Link Invalid</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px', lineHeight: '1.5' }}>
              We couldn't find a clubhouse associated with this link. Please double-check the URL or ask your admin for a fresh invite.
            </p>
            <Link href="/login" style={{ ...styles.signupBtn, textDecoration: 'none', display: 'block', marginTop: '20px' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text" placeholder="John Smith"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input} required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email" placeholder="name@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={styles.input} required
              />
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel" placeholder="555-555-5555"
                  value={phoneNumber} onChange={handlePhoneChange}
                  style={styles.input} maxLength={12}
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>GHIN Number</label>
                <input
                  type="text" placeholder="Optional"
                  value={ghinNumber} onChange={(e) => setGhinNumber(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Create Password</label>
              <input
                type="password" placeholder="6+ characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={styles.input} required
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.signupBtn}>
              {loading ? 'Processing...' : `Complete ${courseInfo.name} Signup`}
            </button>
          </form>
        )}

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
  card: { background: '#fff', padding: '35px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #eee' },
  row: { display: 'flex', gap: '15px' },
  inputGroup: { marginBottom: '22px' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: '8px' },
  input: { width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px', border: '1px solid #bbb', boxSizing: 'border-box' as const, color: '#1a1a1a', fontWeight: '500' as const, outlineColor: '#eecb33', backgroundColor: '#fff' },
  signupBtn: { width: '100%', padding: '16px', background: '#eecb33', color: '#1a1a1a', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, fontSize: '16px', cursor: 'pointer' as const, marginTop: '10px', textAlign: 'center' as const },
  errorText: { color: '#c62828', fontSize: '13px', textAlign: 'center' as const, marginBottom: '15px', fontWeight: 'bold' as const },
  footer: { marginTop: '25px', textAlign: 'center' as const },
  footerText: { fontSize: '14px', color: '#333', fontWeight: '500' as const },
  link: { color: '#eecb33', fontWeight: 'bold' as const, textDecoration: 'none' }
}