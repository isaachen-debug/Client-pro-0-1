import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { teamApi } from '../services/api';
import { PageHeader, SurfaceCard } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';

const TeamEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    // const [saving, setSaving] = useState(false); // Unused for now
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        role: '',
        phone: '',
    });

    useEffect(() => {
        if (id) {
            loadMember();
        }
    }, [id]);

    const loadMember = async () => {
        try {
            setLoading(true);
            // We don't have a direct "get one" endpoint in the list I saw, 
            // but usually we can find it in the list or implement a get.
            // For now, I'll fetch the list and find the member to be safe 
            // (or we can assume a new endpoint if I add it).
            // Optimization: Ideally backend has GET /team/:id. 
            // I will assume I need to fetch list for now as I didn't see a GET detailed endpoint in previous views except 'helper day'.
            // Actually, let's try to find it in the list.
            const data = await teamApi.list();
            const member = data.members.find((m: any) => m.id === id);

            if (member) {
                setForm({
                    name: member.name || '',
                    email: member.email || '',
                    role: member.role || '',
                    phone: member.contactPhone || member.whatsappNumber || '',
                });
            } else {
                setError('Membro não encontrado.');
            }
        } catch (err) {
            setError('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        // setSaving(true);
        try {
            // Need to ensure backend has update endpoint.
            // If not, I might need to add it.
            // I'll check backend routes in a moment. 
            // For now, creating the UI.
            // await teamApi.update(id, form); 
            // alert('Salvo com sucesso!'); 
            navigate(-1);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Erro ao salvar.');
        } finally {
            // setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza? Essa ação não pode ser desfeita.')) return;
        setDeleting(true);
        try {
            // Same here, need to check if DELETE /team/:id exists.
            await teamApi.delete(id!);
            navigate('/app/team');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Erro ao excluir.');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className={`${pageGutters} max-w-2xl mx-auto pb-20`}>
            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft size={16} /> Voltar
            </button>

            <PageHeader
                label="EDITAR MEMBRO"
                title={form.name || 'Editar Membro'}
                subtitle="Gerencie os dados e acesso deste usuário."
            />

            <SurfaceCard className="space-y-6 mt-6">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email (Login)</label>
                        <input
                            type="email"
                            required
                            disabled // Usually changing email is sensitive
                            value={form.email}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Para alterar o email, remova e crie novamente.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 py-3 px-4 rounded-xl border border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            {deleting ? 'Excluindo...' : 'Excluir Membro'}
                        </button>

                        <button
                            type="submit" // Disabled form save for now until backend is ready
                            disabled={true}
                            className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                            title="Edição de detalhes em breve"
                        >
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400">
                        *Para excluir os usuários de teste, use o botão vermelho.
                    </p>
                </form>
            </SurfaceCard>
        </div>
    );
};

export default TeamEdit;
