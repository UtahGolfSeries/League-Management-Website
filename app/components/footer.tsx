'use client'

import React from 'react'
import { useAuth } from "../context/AuthContext"

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const { user, logout, courseName } = useAuth() 

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.topSection}>
          <div style={styles.brand}>
            <h3 style={styles.brandTitle}>LinkLogik Pro</h3>
            <p style={styles.brandTagline}>Advanced League Management Systems</p>
          </div>
          
          <div style={styles.linksColumn}>
            <span style={styles.columnTitle}>Platform</span>
            <a href="/support" style={styles.footerLink}>Support</a>
            <a href="/privacy" style={styles.footerLink}>Privacy Policy</a>
          </div>
        </div>

        <div style={styles.bottomBar}>
          <p style={styles.copyright}>
           {currentYear} {courseName ? courseName.toUpperCase() : "GOLF LEAGUE"} Powered by <span style={{ color: '#eecb33' }}>© LinkLogik Pro</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

const styles = {
  footer: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '40px 20px 20px 20px',
    borderTop: '3px solid #eecb33',
    marginTop: 'auto', // Pushes to bottom in flex containers
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '30px',
    marginBottom: '30px',
  },
  brand: {
    flex: '1 1 300px',
  },
  brandTitle: {
    color: '#eecb33',
    margin: '0 0 10px 0',
    fontSize: '20px',
  },
  brandTagline: {
    color: '#bbb',
    fontSize: '14px',
    margin: 0,
  },
  linksColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  columnTitle: {
    fontWeight: 'bold' as const,
    marginBottom: '5px',
    color: '#fff',
  },
  footerLink: {
    color: '#bbb',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.2s',
  },
  bottomBar: {
    borderTop: '1px solid #333',
    paddingTop: '20px',
    textAlign: 'center' as const,
  },
  copyright: {
    color: '#888',
    fontSize: '12px',
    margin: 0,
  },
}