'use client'

import Link from 'next/link'
import { useAuth } from "../context/AuthContext"
import { usePathname } from 'next/navigation'

export default function Header() {
  // Pull courseName from the Auth Context
  const { user, logout, courseName } = useAuth() 
  const pathname = usePathname()

  const isAdmin = user?.role === 'admin'
  const isPlayer = user && user.role !== 'admin'
  
  const isActive = (path: string) => pathname === path

  return (
    <nav style={styles.nav}>
      <div style={styles.logoContainer}>
        <Link href="/" style={styles.logoText}>
          {/* DYNAMIC COURSE NAME HERE */}
          {courseName ? courseName.toUpperCase() : "GOLF LEAGUE"}
        </Link>
        {isAdmin && (
          <span style={styles.adminBadge}>Admin</span>
        )}
      </div>
      
      <div style={styles.links}>
        <Link href="/" style={isActive('/') ? styles.activeLink : styles.link}>Home</Link>
        
        {user ? (
          <>
            {isAdmin && (
              <>
                <Link href="/standings" style={isActive('/standings') ? styles.activeLink : styles.link}>Standings</Link>
                <Link href="/admin/schedule" style={isActive('/admin/schedule') ? styles.activeLink : styles.link}>Schedule</Link>
                <Link href="/admin/leagues" style={isActive('/admin/leagues') ? styles.activeLink : styles.link}>Leagues</Link>
                <Link href="/admin/members" style={isActive('/admin/members') ? styles.activeLink : styles.link}>Members</Link>
                <Link href="/account" style={isActive('/account') ? styles.activeLink : styles.link}>Account</Link>
              </>
            )}

            {isPlayer && (
              <>
                <Link href="/standings" style={isActive('/standings') ? styles.activeLink : styles.link}>Standings</Link>
                <Link href="/schedule" style={isActive('/schedule') ? styles.activeLink : styles.link}>Schedule</Link>
                <Link href="/enter-score" style={isActive('/enter-score') ? styles.activeLink : styles.link}>Enter Score</Link>
                <Link href="/account" style={isActive('/account') ? styles.activeLink : styles.link}>My Locker</Link>
              </>
            )}
            
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" style={isActive('/login') ? styles.activeLink : styles.link}>Login</Link>
            <Link href="/signup" style={styles.signUpBtn}>Join League</Link>
          </>
        )}
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    height: '70px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    backgroundColor: '#1a1a1a',
    color: 'white',
    borderBottom: '3px solid #eecb33',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoText: { 
    color: 'white', 
    textDecoration: 'none', 
    fontWeight: '900' as const, 
    fontSize: '18px', 
    letterSpacing: '1px' 
  },
  adminBadge: {
    backgroundColor: '#eecb33',
    color: 'black',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
  },
  links: { display: 'flex', alignItems: 'center', gap: '25px' },
  link: { 
    color: '#bbb', 
    textDecoration: 'none', 
    fontSize: '14px', 
    fontWeight: 'bold' as const,
    transition: 'color 0.2s'
  },
  activeLink: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    borderBottom: '2px solid #eecb33',
    paddingBottom: '5px'
  },
  logoutBtn: { 
    background: 'transparent', 
    border: '1px solid #444', 
    color: 'white', 
    padding: '6px 12px', 
    cursor: 'pointer', 
    borderRadius: '6px',
    fontSize: '12px'
  },
  signUpBtn: {
    backgroundColor: '#eecb33', 
    color: 'white', 
    padding: '10px 18px',
    borderRadius: '8px', 
    textDecoration: 'none', 
    fontSize: '14px',
    fontWeight: 'bold' as const
  }
}