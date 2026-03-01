'use client'

import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMembership, setActiveMembership] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // 1. Fetch Global Profile (Identity & SuperAdmin status)
          const { data: profile } = await supabase
            .from('member')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single()

          // 2. Fetch all Course Memberships (Course-specific roles)
          const { data: memberships } = await supabase
            .from('memberships')
            .select('*, courses(name, slug)')
            .eq('user_id', session.user.id)

          // 3. Persist Active Membership selection
          const savedMembershipId = localStorage.getItem('active_membership_id')
          let currentActive = memberships?.find(m => m.id === savedMembershipId) || memberships?.[0] || null

          if (currentActive) {
            localStorage.setItem('active_membership_id', currentActive.id)
            setActiveMembership(currentActive)
          }

          // 4. Set the USER state
          // CRITICAL: We prioritize the role from the active membership unless global role is 'superadmin'
          setUser({ 
            ...session.user, 
            ...profile, 
            role: profile?.role === 'superadmin' ? 'superadmin' : (currentActive?.role || 'player'),
            memberships: memberships || [] 
          })
        }
      } catch (err) {
        console.error("Initialization error:", err)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('member').select('*').eq('auth_user_id', session.user.id).single()
        const { data: memberships } = await supabase.from('memberships').select('*, courses(name, slug)').eq('user_id', session.user.id)
        
        const savedId = localStorage.getItem('active_membership_id')
        const currentActive = memberships?.find(m => m.id === savedId) || memberships?.[0] || null
        
        setUser({ 
          ...session.user, 
          ...profile, 
          role: profile?.role === 'superadmin' ? 'superadmin' : (currentActive?.role || 'player'),
          memberships: memberships || [] 
        })
        
        if (currentActive) {
           setActiveMembership(currentActive)
           localStorage.setItem('active_membership_id', currentActive.id)
        }
      } else {
        setUser(null)
        setActiveMembership(null)
        localStorage.removeItem('active_membership_id')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signup(
    email: string, 
    password: string, 
    displayName: string, 
    phone: string, 
    ghin: string, 
    courseId: string
  ) {
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    let userId = data.user?.id

    if (authError) {
       if (authError.message.includes("already registered")) {
         throw new Error("This email is already registered. Please log in to join a new course.")
       }
       throw authError
    }

    if (!userId) throw new Error("Authentication failed")

    // Upsert Global Profile
    const { error: profileError } = await supabase
      .from('member')
      .upsert({
          auth_user_id: userId,
          display_name: displayName,
          email: email,
          phone_number: phone,
          role: 'player' // Global default
        }, { onConflict: 'auth_user_id' })

    if (profileError) throw profileError

    // Create Course-Specific Membership
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        course_id: courseId,
        ghin_number: ghin,
        handicap_index: 0,
        role: 'player' // Specific role for this course
      })

    if (membershipError) {
      if (membershipError.code === '23505') throw new Error("You are already a member of this course.")
      throw membershipError
    }

    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setActiveMembership(null)
    localStorage.removeItem('active_membership_id')
    window.location.href = '/' 
  }

  // UPDATED: When switching courses, we update the user.role too
  const switchCourse = (membershipId: string) => {
    const selected = user?.memberships?.find((m: any) => m.id === membershipId)
    if (selected) {
        setActiveMembership(selected)
        localStorage.setItem('active_membership_id', selected.id)
        
        // Update user state role for immediate UI feedback
        setUser((prev: any) => ({
          ...prev,
          role: prev.role === 'superadmin' ? 'superadmin' : selected.role
        }))
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      activeMembership, 
      switchCourse, 
      login, 
      logout, 
      loading, 
      signup 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}