import { FormEvent, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = (location.state as { from?: string })?.from || '/';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Não foi possível fazer login. Verifique suas credenciais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#f0f2f5] via-white to-[#eaf6f0] flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-20 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-10 right-0 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl animate-[pulse_7s_ease-in-out_reverse_infinite]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[110%] h-48 bg-gradient-to-t from-primary-100/70 to-transparent rounded-t-full blur-2xl" />
      </div>
      <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-2 items-center">
        <div className="text-center lg:text-left space-y-5">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/70 border border-white shadow-sm backdrop-blur-sm text-primary-600 text-xs font-semibold">
            <span>Plataforma completa para equipes de limpeza</span>
          </div>
          <div className="space-y-2">
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">Organize sua operação em qualquer lugar</p>
            <p className="text-gray-600 text-base lg:text-lg max-w-lg mx-auto lg:mx-0">
              Agenda, clientes e financeiro em um único painel pensado para celulares. Acesse pelo navegador ou instale como app.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {[
              'Agenda visual (mensal/semanal)',
              'Cadastro completo de clientes',
              'Cobranças com faturas compartilháveis',
              'Relatórios em tempo real',
            ].map((feature) => (
              <div key={feature} className="flex items-center space-x-3 bg-white/70 rounded-2xl px-4 py-3 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <p className="text-sm text-gray-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-sm justify-self-center relative">
          <div className="bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.12)] p-6 space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="E-mail"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Senha"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#1ba653] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="text-center">
              <button type="button" className="text-[#1877f2] text-sm font-semibold hover:underline">
                Esqueceu a senha?
              </button>
              <div className="h-px bg-gray-200 my-4" />
              <Link
                to="/register"
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-[#42b72a] text-white font-semibold rounded-lg hover:bg-[#36a420] transition-colors"
              >
                Criar nova conta
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            <span className="font-semibold">Crie uma página</span> para sua empresa ou equipe.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

