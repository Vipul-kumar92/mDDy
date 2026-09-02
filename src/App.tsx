import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import CustomerListPage from './pages/CustomerListPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import RateConfigPage from './pages/RateConfigPage';
import VendorListPage from './pages/VendorListPage';
import VendorDetailPage from './pages/VendorDetailPage';
import CalculatorPage from './pages/CalculatorPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import QuickAddPage from './pages/QuickAddPage';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="/quick-add"
            element={
              <Protected>
                <QuickAddPage />
              </Protected>
            }
          />
          <Route
            path="/customers"
            element={
              <Protected>
                <CustomerListPage />
              </Protected>
            }
          />
          <Route
            path="/rates"
            element={
              <Protected>
                <RateConfigPage />
              </Protected>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <Protected>
                <CustomerDetailPage />
              </Protected>
            }
          />
          <Route
            path="/vendors"
            element={
              <Protected>
                <VendorListPage />
              </Protected>
            }
          />
          <Route
            path="/vendors/:id"
            element={
              <Protected>
                <VendorDetailPage />
              </Protected>
            }
          />
          <Route
            path="/calculator"
            element={
              <Protected>
                <CalculatorPage />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <AdminPage />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
