import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@store/useAuthStore';
import { ProtectedRoute } from '@components/shared/ProtectedRoute';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { HomePage } from '@pages/HomePage';

// Auth redirect wrapper
const AuthRedirect = ({ children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();
  
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (authUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRedirect>
              <RegisterPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster 
        position="top-center"
        containerStyle={{
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            maxWidth: '90vw',
            width: 'auto',
            minWidth: '280px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#1a1a2e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1a1a2e',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
