import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from './types';
import { initDB, login, getUser, signUp } from './services/dbService';
import { LayoutDashboard, Users, Calendar, LogOut, CheckCircle2, Menu, X } from 'lucide-react';
import { ToastProvider, useToast } from './components/Toast';

import Dashboard from './pages/Dashboard';
import Trainings from './pages/Trainings';
import UsersPage from './pages/Users';
import AttendanceCheckIn from './pages/AttendanceCheckIn';
import PublicRegistration from './pages/PublicRegistration';
import LandingPage from './pages/LandingPage';

interface AuthContextType {
  user: User | null;
  loginUser: (u: User) => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

const useRouter = () => {
  const [route, setRoute] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handler = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  return { route, navigate };
};

const AuthPanel: React.FC<{ initialMode?: 'signin' | 'signup'; showBackToHome?: boolean }> = ({
  initialMode = 'signin',
  showBackToHome = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { loginUser } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (user) {
        loginUser(user);
        navigate('#/');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const user = await signUp(name, email, password);
      loginUser(user);
      showToast('Workspace created successfully.', 'success');
      navigate('#/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {showBackToHome && (
          <button
            type="button"
            onClick={() => navigate('#/')}
            className="mb-3 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Back to Home
          </button>
        )}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <h1 className="text-3xl font-bold text-white">TrainTrack</h1>
          <p className="text-cyan-200 mt-2">Training Management System</p>
        </div>

        <div className="p-4 pb-0">
          <div className="bg-gray-100 rounded-md p-1 flex">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === 'signin' ? 'bg-white shadow text-cyan-700' : 'text-gray-600'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === 'signup' ? 'bg-white shadow text-cyan-700' : 'text-gray-600'}`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="p-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              Create Workspace
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

interface NavLinkProps {
  item: { label: string; icon: React.ComponentType<{ className?: string }>; path: string };
  mobile?: boolean;
  isActive: boolean;
  onClick: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ item, mobile = false, isActive, onClick }) => {
  const baseClass = mobile
    ? 'flex items-center w-full px-4 py-3 text-base font-medium rounded-md transition-colors'
    : 'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors mb-1';

  const activeClass = isActive ? 'bg-cyan-700 text-white' : 'text-slate-200 hover:bg-slate-700 hover:text-white';

  return (
    <button onClick={onClick} className={`${baseClass} ${activeClass}`}>
      <item.icon className="w-5 h-5 mr-3" />
      {item.label}
    </button>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logoutUser } = useAuth();
  const { route, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '#/', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUB_ADMIN] },
    { label: 'Trainings', icon: Calendar, path: '#/trainings', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUB_ADMIN] },
    { label: 'Users', icon: Users, path: '#/users', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  ];

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-cyan-400" />
            TrainTrack
          </h1>
          <div className="mt-6 p-4 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-300 uppercase font-semibold">Logged in as</p>
            <p className="font-medium truncate">{user?.name}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-cyan-700 text-white border border-cyan-500">
              {user?.role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <nav className="flex-1 px-4 mt-4">
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              item={item}
              isActive={route === item.path || (route === '#/' && item.path === '#/')}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logoutUser}
            className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-20">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-cyan-400" />
            TrainTrack
          </h1>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-10 bg-slate-900 bg-opacity-95 pt-20 px-4 pb-4">
            <nav className="space-y-2">
              {filteredNav.map(item => (
                <NavLink
                  key={item.path}
                  item={item}
                  mobile
                  isActive={route === item.path || (route === '#/' && item.path === '#/')}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                />
              ))}
              <button
                onClick={logoutUser}
                className="flex items-center w-full px-4 py-3 text-base font-medium text-red-300 hover:bg-slate-800 rounded-md mt-8"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};

const AppInner: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const { route, navigate } = useRouter();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDB();
        const storedUser = localStorage.getItem('traintrack_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;
          const fetchedUser = await getUser(parsedUser.id);
          if (fetchedUser && fetchedUser.workspaceId === parsedUser.workspaceId) {
            setUser(fetchedUser);
          } else {
            localStorage.removeItem('traintrack_user');
          }
        }
      } catch (err) {
        console.error('Initialization failed:', err);
      }
    };
    void bootstrap();
  }, []);

  const loginUser = (u: User) => {
    setUser(u);
    localStorage.setItem('traintrack_user', JSON.stringify(u));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('traintrack_user');
    window.location.hash = '#/';
  };

  if (route.startsWith('#/attend/')) {
    const [, , workspaceId, trainingId] = route.split('/');
    if (workspaceId && trainingId) {
      return <AttendanceCheckIn workspaceId={workspaceId} trainingId={trainingId} />;
    }
  }

  if (route.startsWith('#/register/')) {
    const [, , workspaceId, trainingId] = route.split('/');
    if (workspaceId && trainingId) {
      return <PublicRegistration workspaceId={workspaceId} trainingId={trainingId} />;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {!user ? (
        route === '#/auth' ? (
          <AuthPanel initialMode="signin" showBackToHome />
        ) : route === '#/signup' ? (
          <AuthPanel initialMode="signup" showBackToHome />
        ) : (
          <LandingPage onGetStarted={() => navigate('#/signup')} onSignIn={() => navigate('#/auth')} />
        )
      ) : (
        <Layout>
          {route === '#/' && <Dashboard />}
          {route === '#/trainings' && <Trainings />}
          {route === '#/users' && <UsersPage />}
        </Layout>
      )}
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
};

export default App;

