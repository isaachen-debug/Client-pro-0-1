import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Start from './pages/Start';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Invoice from './pages/Invoice';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <PreferencesProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="start" element={<Start />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="semana" element={<Agenda initialMode="week" />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="profile" element={<Profile />} />
            <Route path="invoice/:id" element={<Invoice />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PreferencesProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

