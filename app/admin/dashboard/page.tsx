'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function CourseAdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [showQr, setShowQr] = useState(false)
  
  const [courseData, setCourseData] = useState<{ name: string; slug: string } | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
  const getCourseInfo = async () => {
  // Ensure we have a user and their UUID
  // Based on your schema, we need the auth_user_id (the UUID), not the numeric id
  const uuid = user?.auth_user_id || user?.id;

  // Safety check: UUIDs are usually 36 characters long. 
  // If uuid is "21", this check will stop the bad request.
  if (!uuid || uuid.length < 10) {
    console.warn("Waiting for a valid UUID. Current ID is:", uuid);
    return;
  }
  
  setFetching(true);
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        course_id,
        courses (
          name,
          slug
        )
      `)
      .eq('user_id', uuid) // This now sends the long UUID string instead of "21"
      .maybeSingle();

    if (error) throw error;

    if (data?.courses) {
      const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;
      if (course?.slug) {
        setCourseData({ name: course.name, slug: course.slug });
      }
    }
  } catch (err) {
    console.error("Dashboard Fetch Error:", err);
  } finally {
    setFetching(false);
  }
};

  if (!authLoading) getCourseInfo()
}, [user, authLoading])

  // Construct the link dynamically
  const signupUrl = courseData?.slug 
  ? `${window.location.origin}/signup?c=${courseData.slug}`
  : `LINK_ERROR_CHECK_DB`; // This will make the error obvious in the UI

  const copyToClipboard = () => {
    if (!courseData?.slug) {
      return alert("Wait! We haven't found your clubhouse slug yet. Please refresh.")
    }
    navigator.clipboard.writeText(signupUrl)
    alert("Signup link copied to clipboard!")
  }

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-download')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `${courseData?.slug || 'clubhouse'}-signup-qr.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  if (authLoading || fetching) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Clubhouse Dashboard...</div>

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>{courseData?.name || 'Clubhouse'} Admin</h1>
        <p>Manage your league and recruit new players.</p>
      </header>

      <section style={styles.shareCard}>
        <div style={styles.cardInfo}>
          <h3 style={styles.cardTitle}>Player Recruitment</h3>
          <p style={styles.cardSubtitle}>Direct players to your specific registration page.</p>
          
          <div style={{ marginTop: '20px', background: 'white', padding: '15px', display: 'inline-block', borderRadius: '12px', border: '1px solid #eee' }}>
            <QRCodeSVG value={signupUrl} size={150} />
          </div>
        </div>

        <div style={styles.actionArea}>
          <div style={{ marginBottom: '10px' }}>
            <label style={styles.miniLabel}>Your Signup Link</label>
            <div style={styles.linkDisplay}>
              {/* This input will now show the slug correctly if it exists */}
              <input readOnly value={signupUrl} style={styles.linkInput} />
            </div>
          </div>
          <button onClick={copyToClipboard} style={styles.copyBtn}>
            Copy Link
          </button>
          <button onClick={() => setShowQr(true)} style={styles.qrBtn}>
            Download QR Code
          </button>
        </div>
      </section>

      {/* QR CODE MODAL */}
      {showQr && (
        <div style={styles.modalOverlay} onClick={() => setShowQr(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '10px', color: '#000' }}>{courseData?.name} QR Code</h3>
            <div style={styles.qrContainer}>
              <QRCodeSVG 
                id="qr-code-download"
                value={signupUrl} 
                size={256} 
                level={"H"} 
                includeMargin={true}
              />
            </div>
            <p style={styles.modalHint}>Print this and put it on a sign at the first tee!</p>
            <div style={styles.modalActions}>
              <button onClick={downloadQRCode} style={styles.downloadBtn}>Download PNG</button>
              <button onClick={() => setShowQr(false)} style={styles.closeBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  header: { marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' },
  shareCard: { 
    background: '#fff', 
    padding: '30px', 
    borderRadius: '16px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
    border: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '40px'
  },
  cardInfo: { flex: '1 1 300px' },
  cardTitle: { margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a' },
  cardSubtitle: { margin: 0, color: '#666', fontSize: '15px' },
  miniLabel: { fontSize: '10px', fontWeight: 'bold' as const, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  actionArea: { display: 'flex', flexDirection: 'column' as const, gap: '12px', flex: '1 1 300px' },
  linkDisplay: { display: 'flex', marginTop: '5px' },
  linkInput: { 
    flex: 1, 
    padding: '12px', 
    background: '#f5f5f5', 
    border: '1px solid #ddd', 
    borderRadius: '8px', 
    fontSize: '13px',
    color: '#333',
    outline: 'none',
    cursor: 'default'
  },
  copyBtn: { padding: '14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' as const },
  qrBtn: { padding: '14px', background: '#eecb33', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { background: '#fff', padding: '40px', borderRadius: '24px', textAlign: 'center' as const, maxWidth: '400px', width: '90%' },
  qrContainer: { background: '#fff', padding: '10px', display: 'inline-block', border: '1px solid #eee', borderRadius: '12px' },
  modalHint: { margin: '20px 0', color: '#666', fontSize: '14px' },
  modalActions: { display: 'flex', gap: '10px', justifyContent: 'center' },
  downloadBtn: { flex: 1, padding: '14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' as const },
  closeBtn: { flex: 1, padding: '14px', background: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }
}