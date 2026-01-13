import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Empresa from './pages/Empresa';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Invoice from './pages/Invoice';
import Explore from './pages/Explore';
import HelperResources from './pages/HelperResources';
import Apps from './pages/Apps';
import RoutePlanner from './pages/Rotas';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import RoleRoute from './components/RoleRoute';
import Team from './pages/Team';
import Plans from './pages/Plans';
import HelperLayout from './pages/helper/HelperLayout';
import HelperToday from './pages/helper/Today';
import HelperAppointmentDetail from './pages/helper/AppointmentDetail';
import HelperSettings from './pages/helper/Settings';
import ClientHome from './pages/client/Home';
import ClientLayout from './pages/client/Layout';
import ClientSettings from './pages/client/Settings';
import OwnerSettings from './pages/OwnerSettings';
import AddMember from './pages/team/AddMember';

const AppIndexRedirect = () => <Navigate to="agenda" replace />;

function App() {
  const [isTeamMode, setIsTeamMode] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <PreferencesProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['OWNER']}>
                    <Layout isTeamMode={isTeamMode} setIsTeamMode={setIsTeamMode} />
                  </RoleRoute>
                </PrivateRoute>
              }
            >
              <Route index element={<AppIndexRedirect />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="explore" element={<Explore />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="semana" element={<Agenda initialMode="week" />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="rotas" element={<RoutePlanner />} />
              <Route path="plans" element={<Plans />} />
              <Route path="empresa" element={<Empresa />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<OwnerSettings />} />
              <Route path="team" element={<Team />} />
              <Route path="team/add" element={<AddMember />} />
              <Route path="apps" element={<Apps />} />
              <Route path="helper-resources" element={<HelperResources />} />
              <Route path="invoice/:id" element={<Invoice />} />
            </Route>

            <Route
              path="/helper"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['HELPER']}>
                    <HelperLayout />
                  </RoleRoute>
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="today" replace />} />
              <Route path="today" element={<HelperToday />} />
              <Route path="settings" element={<HelperSettings />} />
              <Route path="appointments/:id" element={<HelperAppointmentDetail />} />
            </Route>

            <Route
              path="/client"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['CLIENT']}>
                    <ClientLayout />
                  </RoleRoute>
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<ClientHome />} />
              <Route path="settings" element={<ClientSettings />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </PreferencesProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
