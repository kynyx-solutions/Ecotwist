import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { isConfigured, supabase } from './lib/supabase';
import { AuthCard, ForgotScreen, LoginScreen, NewPasswordScreen, SetupNotice } from './Login';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { LeadDetail, LeadList, NewLead } from './Leads';
import { Settings } from './Settings';
import { CustomerDetail, CustomerList } from './Customers';
import { OrderDetail, OrderList } from './Orders';
import { Staff } from './Staff';
import { websiteRoutes } from './website/routes';
import { messagingRoutes } from './messaging/routes';
import { seoRoutes } from './seo/routes';
import { blogRoutes } from './blog/routes';
import { Button, Spinner, ToastProvider } from './ui';

function Gate() {
  const { session, profile, loading, recovering } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [forgot, setForgot] = useState(false);

  if (!isConfigured) return <SetupNotice />;
  if (loading) return <Spinner />;

  // Reached from a password-reset email: the link signs the user in first
  if (session && (recovering || location.pathname === '/reset')) {
    return <NewPasswordScreen onDone={() => navigate('/', { replace: true })} />;
  }

  if (!session) {
    return forgot ? <ForgotScreen onBack={() => setForgot(false)} /> : <LoginScreen onForgot={() => setForgot(true)} />;
  }

  // Signed in, but not on the staff list (e.g. the database script hasn't run yet)
  if (!profile) {
    return (
      <AuthCard title="No access yet" subtitle={session.user.email}>
        <p className="mb-4 text-sm text-gray-600">This login isn't set up as staff. Ask the owner to add you, or run the setup script in Supabase.</p>
        <Button variant="secondary" className="w-full" onClick={() => supabase.auth.signOut()}>Log out</Button>
      </AuthCard>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadList />} />
        <Route path="/leads/new" element={<NewLead />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        {websiteRoutes.map((r) => <Route key={r.path} {...r} />)}
        {messagingRoutes.map((r) => <Route key={r.path} {...r} />)}
        {seoRoutes.map((r) => <Route key={r.path} {...r} />)}
        {blogRoutes.map((r) => <Route key={r.path} {...r} />)}
        <Route path="/staff" element={<Staff />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
