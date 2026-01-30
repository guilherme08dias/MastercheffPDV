import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { SimplePOS } from './components/SimplePOS';
import { POS } from './components/POS';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { Cardapio } from './components/Cardapio';
import { Profile, UserRole } from './types';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';

type AppView = 'login' | 'pos' | 'admin' | 'cardapio';

import { MobileTabBar } from './components/MobileTabBar';
import { ConnectivityBadge } from './components/ConnectivityBadge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useIsMobile } from './hooks/useIsMobile';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [adminSection, setAdminSection] = useState('dashboard'); // New state for admin nav
  const isMobile = useIsMobile();

  useEffect(() => {
    // ... (rest of useEffect logic remains same, just replacing component start)
    const path = window.location.pathname;

    // Customer menu route only
    if (path === '/pedido') {
      setCurrentView('cardapio');
      setLoading(false);
      return;
    }

    // Standard auth flow for all other routes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else {
        setCurrentView('login');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setUserProfile(null);
        setCurrentView('login');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... (fetchProfile and handleLogout remain same)
  const fetchProfile = async (userId: string, email?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
        // Determinar view inicial baseada no role
        // Garantir que o email admin@xismaster.com sempre seja admin
        const isHardcodedAdmin = data.email === 'admin@xismaster.com' || email === 'admin@xismaster.com';
        const finalRole = isHardcodedAdmin ? 'admin' : data.role;

        setUserProfile({
          id: data.id,
          email: data.email || email || '',
          role: finalRole as UserRole,
          full_name: data.full_name
        });

        // Lógica de roteamento baseada no cargo (role)
        if (finalRole === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('pos');
        }
      } else if (email) {
        // Criar perfil se não existir
        const newProfile: Partial<Profile> = {
          id: userId,
          email: email,
          role: 'cashier'
        };

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (created) {
          setUserProfile(created);
          setCurrentView('pos');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setCurrentView('login');
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
        </div>
        <Toaster position="top-center" />
      </ThemeProvider>
    );
  }

  if (currentView === 'cardapio') {
    return (
      <ThemeProvider>
        <Cardapio />
        <Toaster position="top-center" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <ConnectivityBadge />
          {!session && <LoginScreen />}

          {session && userProfile && (
            <>
              {currentView === 'admin' && (
                <AdminDashboard
                  user={userProfile}
                  onNavigateToPos={() => setCurrentView('pos')}
                  onLogout={handleLogout}
                  activeSection={adminSection}
                />
              )}

              {currentView === 'pos' && (
                <POS
                  user={userProfile}
                  onBackToAdmin={() => setCurrentView('admin')}
                  onLogout={handleLogout}
                />
              )}

              {/* Mobile Tab Bar - Only on Mobile AND NOT in POS (POS has internal nav) AND NOT in Admin (Admin has internal nav) */}
              {isMobile && currentView !== 'pos' && currentView !== 'admin' && (
                <MobileTabBar
                  currentView={currentView}
                  onNavigate={(view) => setCurrentView(view)}
                  onLogout={handleLogout}
                  onNavigateToSection={setAdminSection}
                />
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
};

export default App;