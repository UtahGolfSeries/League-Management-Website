'use client'
import React from 'react'

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode; // For the Week Selector or Buttons
}

export default function PageHeader({ title, subtitle, rightElement }: PageHeaderProps) {
  return (
    <div style={styles.headerBox}>
      <div style={styles.headerInfo}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      {rightElement && (
        <div style={styles.rightContainer}>
          {rightElement}
        </div>
      )}
    </div>
  )
}

const styles = {
  headerBox: { 
    background: '#1a1a1a', 
    padding: '25px 20px',
    borderRadius: '12px',
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  headerInfo: { display: 'flex', flexDirection: 'column' as const },
  title: { margin: 0, fontSize: '22px', color: '#fff', fontWeight: 'bold' as const },
  subtitle: { margin: 0, fontSize: '10px', color: '#eecb33', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', marginTop: '4px' },
  rightContainer: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' }
}