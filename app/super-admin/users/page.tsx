'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'

interface UserProfile {
  auth_user_id: string;
  display_name: string;
  email: string;
  role: string;
  memberships: {
    id: string;
    course_id: string;
    role: string;
    courses: { name: string };
  }[];
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [courses, setCourses] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')

  // Edit Modal States
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editGlobalRole, setEditGlobalRole] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Courses for the dropdown
      const { data: courseData } = await supabase.from('courses').select('id, name')
      if (courseData) setCourses(courseData)

      // 2. Fetch Users - Explicitly naming the relationship to 'courses'
      const { data: userData, error } = await supabase
        .from('member')
        .select(`
          auth_user_id,
          display_name,
          email,
          role,
          memberships (
            id,
            course_id,
            role,
            courses ( name )
          )
        `)
      
      if (error) throw error
      
      // The "Double Cast" fix for your TypeScript error
      setUsers(userData as unknown as UserProfile[])
    } catch (err: any) {
      console.error("Fetch Error:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
  // FIX: Using the correct state variable name 'selectedUser'
  if (!selectedUser) return; 
  setEditLoading(true);

  // LOGIC: 
  // 'admin' in dropdown -> Local Admin in memberships, but stays 'player' in global member table
  // 'player' in dropdown -> Player in both
  const isClubAdmin = editGlobalRole === 'admin';
  const localRole = isClubAdmin ? 'admin' : 'player';

  try {
    // 1. Update Global Profile (member table)
    // We keep them as 'player' so they don't get your SuperAdmin powers
    const { error: memberError } = await supabase
      .from('member')
      .update({ role: 'player' }) 
      .eq('auth_user_id', selectedUser.auth_user_id);

    if (memberError) throw memberError;

    // 2. Update Clubhouse Membership (memberships table)
    // This gives them the 'Admin' dashboard for their specific course
    const { error: membershipError } = await supabase
      .from('memberships')
      .update({ role: localRole })
      .eq('user_id', selectedUser.auth_user_id);

    if (membershipError) throw membershipError;

    alert(`User updated to ${localRole.toUpperCase()} status.`);
    setSelectedUser(null);
    await fetchInitialData();
  } catch (err: any) {
    console.error("Sync Error:", err);
    alert("Database Error: " + err.message);
  } finally {
    setEditLoading(false);
  }
};

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesCourse = courseFilter === 'all' || user.memberships?.some(m => m.course_id === courseFilter)
    return matchesSearch && matchesRole && matchesCourse
  })

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>User Directory</h1>
        <p style={styles.subtitle}>Manage platform access and clubhouse permissions.</p>
      </header>

      {/* FILTER BAR */}
      <section style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Search</label>
          <input 
            style={styles.input} 
            placeholder="Name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Global Role</label>
          <select style={styles.input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="superadmin">SuperAdmin</option>
            <option value="player">Player</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Clubhouse</label>
          <select style={styles.input} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </section>

      {/* USER TABLE */}
      <section style={styles.card}>
        {loading ? <p>Loading directory...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>User Details</th>
                <th style={styles.th}>Global Role</th>
                <th style={styles.th}>Course Access</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.auth_user_id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{user.display_name || 'No Name'}</strong>
                    <div style={styles.subtext}>{user.email}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={user.role === 'superadmin' ? styles.superBadge : styles.roleBadge}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.memberships?.length > 0 ? (
                      user.memberships.map((m, i) => (
                        <div key={i} style={styles.membershipItem}>
                          {m.courses?.name} <span style={styles.roleSubtext}>({m.role})</span>
                        </div>
                      ))
                    ) : <span style={{ color: '#999', fontSize: '12px' }}>No Clubhouse</span>}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button 
                        style={styles.editBtn}
                        onClick={() => {
                            setSelectedUser(user);
                            setEditGlobalRole(user.role);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* EDIT USER MODAL */}
      {selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: '#1a1a1a', marginBottom: '5px' }}>Edit User Permissions</h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
              Updating: <strong>{selectedUser.display_name || selectedUser.email}</strong>
            </p>
            
            <div style={styles.inputGroup}>
  <label style={styles.label}>Clubhouse Permission</label>
  <select 
    style={styles.input} 
    value={editGlobalRole} 
    onChange={(e) => setEditGlobalRole(e.target.value)}
  >
    <option value="player">Standard Player</option>
    <option value="admin">Clubhouse Admin</option>
  </select>
</div>

            <div style={{ marginTop: '20px' }}>
                <label style={styles.label}>Existing Club Memberships</label>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#444' }}>
                    {selectedUser.memberships.length > 0 ? (
                        selectedUser.memberships.map(m => (
                            <div key={m.id} style={{ marginBottom: '5px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                {m.courses.name} — <strong>{m.role}</strong>
                            </div>
                        ))
                    ) : 'No memberships found.'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button onClick={() => setSelectedUser(null)} style={styles.cancelBtn}>Cancel</button>
              <button 
                onClick={handleUpdateUser} 
                style={styles.submitBtn}
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Update Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  header: { marginBottom: '30px' },
  pageTitle: { fontSize: '28px', color: '#1a1a1a', margin: 0, fontWeight: '900' as const },
  subtitle: { color: '#333', marginTop: '5px' },
  filterBar: { display: 'flex', gap: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  filterGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px', flex: 1 },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' },
  card: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableHeader: { backgroundColor: '#1a1a1a' },
  th: { padding: '12px', fontSize: '11px', color: '#fff', textTransform: 'uppercase' as const, fontWeight: '700' as const, textAlign: 'left' as const },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '15px 12px', fontSize: '14px', color: '#1a1a1a', verticalAlign: 'middle' as const },
  subtext: { fontSize: '12px', color: '#666' },
  roleBadge: { padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'capitalize' as const },
  superBadge: { padding: '4px 8px', background: '#eecb33', color: '#000', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'capitalize' as const },
  membershipItem: { fontSize: '12px', marginBottom: '4px' },
  roleSubtext: { color: '#888', fontStyle: 'italic' },
  actionRow: { display: 'flex', gap: '8px', justifyContent: 'center' },
  editBtn: { padding: '6px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: '40px', borderRadius: '24px', width: '450px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '15px' },
  submitBtn: { flex: 2, padding: '14px', background: '#eecb33', color: '#1a1a1a', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '14px', background: '#eee', borderRadius: '8px', cursor: 'pointer', border: 'none', color: '#1a1a1a', fontWeight: 'bold' as const }
}