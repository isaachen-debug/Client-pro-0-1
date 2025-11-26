import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Não foi possível criar sua conta. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f2f5] via-white to-[#eaf6f0] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-primary-300/20 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-2 items-center relative">
        <div className="text-center lg:text-left space-y-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 border border-white shadow-sm text-primary-600 text-xs font-semibold backdrop-blur">
            Comece em menos de 3 minutos
          </div>
          <div className="space-y-2">
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">Crie sua conta Client Pro</p>
            <p className="text-gray-600 text-base lg:text-lg max-w-lg mx-auto lg:mx-0">
              Gestão de clientes, agenda e financeiro acessível em qualquer dispositivo. Perfeito para quem opera em campo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            {['30 dias grátis', 'Sem cartão agora', 'Equipe ilimitada', 'Suporte em português'].map((item) => (
              <div key={item} className="flex items-center space-x-3 bg-white/80 rounded-2xl px-4 py-3 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-md justify-self-center">
          <div className="bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.12)] p-6 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">Criar nova conta</h2>
              <p className="text-sm text-gray-500">É rápido e fácil.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="E-mail"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Senha"
                  required
                />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Confirmar senha"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#1aa454] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Já possui conta?{' '}
              <Link to="/login" className="text-[#1877f2] font-semibold hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

