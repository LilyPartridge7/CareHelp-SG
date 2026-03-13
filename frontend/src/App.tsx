import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme/theme';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from './store/store';
import { openCreatePostModal, setSearchQuery } from './store/slices/uiSlice';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';

import { SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PostAddIcon from '@mui/icons-material/PostAdd';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#331111', color: '#ffaaaa', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h1>💥 React Render Crash Detected</h1>
          <p>The application crashed while rendering the UI. Please report this stack trace:</p>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#110000', padding: '1rem' }}>
            {this.state.error?.toString() || 'Unknown Error'}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const colorMode = useSelector((state: RootState) => state.ui.colorMode);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Generate the active Light or Dark theme on the fly
  const activeTheme = getTheme(colorMode);

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      <Sidebar />

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: '0.3s' }}>
        <Navbar />

        <main style={{ flexGrow: 1, padding: '2rem 1rem' }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/user/:username" element={<PublicProfile />} />

            {/* Discussion Board / Home feed is the default view */}
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostDetail />} />
          </Routes>
        </main>
      </div>

      <SpeedDial
        ariaLabel="Action SpeedDial"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1000,
        }}
        icon={<SpeedDialIcon openIcon={<MenuIcon />} />}
      >
        <SpeedDialAction
          key="Start Discussion"
          icon={<PostAddIcon />}
          tooltipTitle="Start Discussion"
          onClick={() => {
            navigate('/');
            dispatch(openCreatePostModal());
          }}
        />
        <SpeedDialAction
          key="Home"
          icon={<HomeIcon />}
          tooltipTitle="Home"
          onClick={() => {
            dispatch(setSearchQuery(''));
            navigate('/');
          }}
        />
      </SpeedDial>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
