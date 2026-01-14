import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/http';

export const PortalAccess = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const authenticateWithToken = async () => {
            if (!token) {
                setStatus('error');
                setError('Link inválido');
                return;
            }

            try {
                setStatus('loading');
                const { data } = await api.get(`/portal/auth/${token}`);

                if (data.success) {
                    setStatus('success');
                    // Redirect to client portal home after short delay
                    setTimeout(() => {
                        navigate('/client/home');
                    }, 1500);
                } else {
                    setStatus('error');
                    setError('Falha na autenticação');
                }
            } catch (err: any) {
                setStatus('error');
                setError(err?.response?.data?.error || 'Link inválido ou expirado');
            }
        };

        authenticateWithToken();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <Loader2 size={64} className="text-indigo-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Autenticando...
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Aguarde enquanto validamos seu acesso
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Acesso Confirmado!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Redirecionando para seu portal...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertCircle size={40} className="text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Acesso Negado
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {error}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                            Por favor, entre em contato com a empresa que lhe enviou este link.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default PortalAccess;
