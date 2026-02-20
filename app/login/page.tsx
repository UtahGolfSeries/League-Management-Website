'use client'

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useRouter } from "next/navigation"
import PageHeader from "../components/pageHeader" // Import the shared component

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // REDIRECT LOGIC: If 'user' becomes truthy, go to account
  useEffect(() => {
    if (user) {
      router.push("/account")
    }
  }, [user, router])

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* SHARED DARK HEADER */}
      <PageHeader 
        title="Member Login" 
        subtitle="UTAH GOLF SERIES TOURNAMENT PORTAL" 
      />

      <div style={styles.card}>
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}
        
        <div style={styles.infoGroup}>
          <label style={styles.label}>Email Address</label>
          <input 
            type="email" 
            placeholder="name@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={styles.input}
          />
        </div>
        
        <div style={styles.infoGroup}>
          <label style={styles.label}>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={styles.input}
          />
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading}
          style={{
            ...styles.loginBtn,
            background: loading ? '#999' : '#eecb33'
          }}
        >
          {loading ? "Verifying..." : "Sign In"}
        </button>
        
        <p style={styles.helpText}>
          Issues logging in? Please see the tournament director.
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  card: { 
    background: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #eee' 
  },
  infoGroup: { marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    boxSizing: 'border-box' as const,
    color: '#000',
    backgroundColor: '#fff',
    outlineColor: '#eecb33'
  },
  loginBtn: { 
    width: '100%', 
    padding: '14px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    fontSize: '16px', 
    fontWeight: 'bold' as const, 
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  errorBox: {
    padding: '12px',
    background: '#fff1f0',
    border: '1px solid #ffa39e',
    color: '#cf1322',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  helpText: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '20px',
    lineHeight: '1.5'
  }
}