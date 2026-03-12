// @ts-nocheck
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { ConfigProvider, Layout, Typography, Dropdown, Avatar, Spin, theme } from 'antd';
import { AuthProvider, useAuth } from './shared/lib/authContext';
import { BookOutlined, UserOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CoursePage from './pages/CoursePage';
import PostPage from './pages/PostPage';
import PostFormPage from './pages/PostFormPage';
import MembersPage from './pages/MembersPage';
import SolutionsPage from './pages/SolutionsPage';
import ProfilePage from './pages/ProfilePage';

const { Header, Content } = Layout;
const { Text } = Typography;

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Мои курсы',
      onClick: () => navigate('/'),
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      danger: true,
      onClick: async () => {
        await logout();
        navigate('/auth');
      },
    },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <BookOutlined style={{ fontSize: 24, color: '#1967d2' }} />
        <Text strong style={{ fontSize: 18, color: '#1967d2' }}>Classroom</Text>
      </Link>

      <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ backgroundColor: '#1967d2' }} icon={<UserOutlined />} />
          <Text style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.credentials}
          </Text>
        </div>
      </Dropdown>
    </Header>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/auth" element={<GuestRoute><AuthPage /></GuestRoute>} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/course/:id" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
      <Route path="/course/:courseId/new-post" element={<ProtectedRoute><PostFormPage /></ProtectedRoute>} />
      <Route path="/course/:id/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/post/:id" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
      <Route path="/post/:postId/edit" element={<ProtectedRoute><PostFormPage /></ProtectedRoute>} />
      <Route path="/post/:postId/solutions" element={<ProtectedRoute><SolutionsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1967d2',
          borderRadius: 8,
          fontFamily:
            "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            <AppHeader />
            <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
              <AppContent />
            </Content>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
