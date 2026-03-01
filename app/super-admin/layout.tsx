// app/super-admin/layout.tsx
'use client'
import { useAuth } from '../context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'superadmin')) {
      router.push('/account')
    }
  }, [user, loading, router])

  if (loading) return <div style={{ padding: '40px', color: '#1a1a1a' }}>Loading Admin Panel...</div>
  if (!user || user.role !== 'superadmin') return null

  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <h2 style={styles.logoText}>ADMIN</h2>
          <div style={styles.divider} />
        </div>
        
        <nav style={styles.nav}>
          <Link href="/super-admin" style={pathname === '/super-admin' ? styles.activeTab : styles.tab}>
            Courses
          </Link>
          <Link href="/super-admin/users" style={pathname === '/super-admin/users' ? styles.activeTab : styles.tab}>
            Users
          </Link>
          <Link href="/super-admin/billing" style={pathname === '/super-admin/billing' ? styles.activeTab : styles.tab}>
            Billing
          </Link>
        </nav>

        <div style={styles.sidebarFooter}>
            <Link href="/account" style={styles.backLink}>← Back to App</Link>
        </div>
      </aside>

      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  dashboard: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7f9' },
  sidebar: { width: '260px', backgroundColor: '#1a1a1a', padding: '30px 20px', color: '#fff', position: 'fixed' as const, height: '100vh', display: 'flex', flexDirection: 'column' as const },
  logoSection: { marginBottom: '30px' },
  logoText: { color: '#eecb33', margin: 0, fontSize: '20px', fontWeight: '900' as const, letterSpacing: '2px' },
  divider: { height: '1px', background: '#333', marginTop: '15px' },
  nav: { display: 'flex', flexDirection: 'column' as const, gap: '10px', flex: 1 },
  tab: { textDecoration: 'none', color: '#ccc', padding: '12px', fontSize: '15px', borderRadius: '6px', transition: 'all 0.2s' },
  activeTab: { textDecoration: 'none', background: '#333', color: '#eecb33', padding: '12px', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '6px' },
  sidebarFooter: { paddingTop: '20px', borderTop: '1px solid #333' },
  backLink: { color: '#888', textDecoration: 'none', fontSize: '13px' },
  main: { flex: 1, marginLeft: '260px', padding: '40px' },
}