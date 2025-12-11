import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellRing } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { LanguageOption, ThemeOption } from '../types';
import usePushNotifications from '../hooks/usePushNotifications';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';

type ProfileFormState = {
  name: string;
  email: string;
  companyName: string;
  primaryColor: string;
  avatarUrl: string;
  preferredTheme: ThemeOption;
  preferredLanguage: LanguageOption;
  whatsappNumber: string;
  contactPhone: string;
};

const Profile = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const { setThemePreference, setLanguagePreference } = usePreferences();
  const pushNotifications = usePushNotifications();

  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    companyName: user?.companyName ?? '',
    primaryColor: user?.primaryColor ?? '#22c55e',
    avatarUrl: user?.avatarUrl ?? '',
    preferredTheme: 'light' as ThemeOption,
    preferredLanguage: (user?.preferredLanguage ?? 'pt') as LanguageOption,
    whatsappNumber: user?.whatsappNumber ?? '',
    contactPhone: user?.contactPhone ?? '',
  }));
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHeroDetails, setShowHeroDetails] = useState(false);

  const trialInfo = useMemo(() => {
    if (!user?.trialEnd) return null;
    const end = new Date(user.trialEnd);
    const daysLeft = differenceInCalendarDays(end, new Date());
    return {
      end,
      daysLeft,
    };
  }, [user?.trialEnd]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name ?? '',
        email: user.email ?? '',
        companyName: user.companyName ?? '',
        primaryColor: user.primaryColor ?? '#22c55e',
        avatarUrl: user.avatarUrl ?? '',
      preferredTheme: 'light' as ThemeOption,
        preferredLanguage: (user.preferredLanguage ?? 'pt') as LanguageOption,
        whatsappNumber: user.whatsappNumber ?? '',
        contactPhone: user.contactPhone ?? '',
      });
    }
  }, [user]);
  const initials =
    profileForm.name.trim() !== ''
      ? profileForm.name
          .split(' ')
          .map((word) => word[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'CP';

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileStatus({ type: 'error', message: 'A imagem deve ter no máximo 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return null;
  }

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileStatus(null);

    const trimmedWhatsapp = profileForm.whatsappNumber.trim();
    const trimmedPhone = profileForm.contactPhone.trim();

    const payload = {
      name: profileForm.name,
      email: profileForm.email,
      companyName: profileForm.companyName,
      primaryColor: profileForm.primaryColor,
      avatarUrl: profileForm.avatarUrl,
      preferredTheme: profileForm.preferredTheme,
      preferredLanguage: profileForm.preferredLanguage,
      whatsappNumber: trimmedWhatsapp || null,
      contactPhone: trimmedPhone || null,
    };

    try {
      await updateProfile(payload);
      setThemePreference(profileForm.preferredTheme);
      setLanguagePreference(profileForm.preferredLanguage);
      setProfileStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível atualizar o perfil.';
      setProfileStatus({ type: 'error', message });
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordStatus(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'As novas senhas não coincidem.' });
      return;
    }

    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus({ type: 'success', message: 'Senha atualizada com sucesso!' });
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível atualizar a senha.';
      setPasswordStatus({ type: 'error', message });
    }
  };

  const themeOptions: { value: ThemeOption; label: string }[] = [{ value: 'light', label: 'Claro' }];

  const languageOptions: { value: LanguageOption; label: string }[] = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto space-y-6`}>
      <PageHeader
        label="MEU PERFIL"
        title="Meu perfil"
        subtitle="Dados pessoais e preferências da sua conta."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] owner-grid-tight">
        <SurfaceCard className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-[28px] border border-slate-200 bg-slate-50 flex items-center justify-center text-2xl font-semibold text-slate-900 overflow-hidden">
                {profileForm.avatarUrl ? (
                  <img src={profileForm.avatarUrl} alt={profileForm.name} className="h-full w-full object-cover rounded-[24px]" />
                ) : (
                  initials
                )}
              </div>
              <div className="space-y-2">
                <p className={labelSm}>Perfil principal</p>
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                  {profileForm.companyName || profileForm.name || 'Atualize seu perfil'}
                </h1>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <StatusBadge tone="primary">Plano: {(user.planStatus ?? 'TRIAL').toUpperCase()}</StatusBadge>
                  {trialInfo && (
                    <StatusBadge tone="warning">
                      {trialInfo.daysLeft >= 0 ? `${trialInfo.daysLeft} dia(s) restantes` : 'Período de testes encerrado'}
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto min-w-[260px]">
              <SurfaceCard className="space-y-1 bg-slate-50 border-slate-100">
                <p className="text-xs text-slate-600 uppercase tracking-wide">Conta criada</p>
                <p className="text-lg font-semibold text-slate-900">
                  {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: ptBR }) : '—'}
                </p>
                <p className="text-xs text-slate-500">{user.isActive ? 'Status: ativa' : 'Status: inativa'}</p>
              </SurfaceCard>
              <SurfaceCard className="space-y-2">
                <p className="text-xs text-slate-600 uppercase tracking-wide flex items-center gap-2">
                  <BellRing size={14} />
                  Push notifications
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {pushNotifications.status === 'enabled' ? 'Ativas neste dispositivo' : 'Ative alertas antes das rotas'}
                </p>
                {pushNotifications.status !== 'enabled' && (
                  <button
                    type="button"
                    onClick={pushNotifications.enable}
                    disabled={pushNotifications.status === 'loading'}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {pushNotifications.status === 'loading' ? 'Ativando...' : 'Ativar push'}
                  </button>
                )}
              </SurfaceCard>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Personalize identidade e canais para helpers e clients.</p>
              {showHeroDetails && (
                <p className="text-xs text-slate-600">
                  Atualize cores, contatos e preferências para manter o app consistente em todos os portais.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowHeroDetails((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-700 border border-primary-100 rounded-full px-3 py-1 hover:bg-primary-50 transition"
            >
              {showHeroDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <p className={labelSm}>Resumo rápido</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SurfaceCard className="bg-slate-50 border-slate-100">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Email</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{profileForm.email || user.email}</p>
            </SurfaceCard>
            <SurfaceCard className="bg-slate-50 border-slate-100">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Telefone</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{profileForm.contactPhone || '—'}</p>
            </SurfaceCard>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SurfaceCard className="bg-slate-50 border-slate-100">
              <p className="text-xs text-slate-600 uppercase tracking-wide">WhatsApp</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{profileForm.whatsappNumber || '—'}</p>
            </SurfaceCard>
            <SurfaceCard className="bg-slate-50 border-slate-100">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Idioma</p>
              <p className="text-sm font-semibold text-slate-900 break-all">
                {profileForm.preferredLanguage.toUpperCase()}
              </p>
            </SurfaceCard>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 owner-grid-tight">
        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={labelSm}>Informações básicas</p>
              <h3 className="text-lg font-semibold text-slate-900">Nome, e-mail e idioma</h3>
            </div>
            <StatusBadge tone="success">
              {profileForm.whatsappNumber || profileForm.contactPhone ? 'Atualizado' : 'Pendentes'}
            </StatusBadge>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2">
              <span className="font-semibold">WhatsApp</span>
              <span className="text-slate-500">{profileForm.whatsappNumber || 'Adicionar número'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2">
              <span className="font-semibold">Telefone</span>
              <span className="text-slate-500">{profileForm.contactPhone || 'Adicionar contato'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2">
              <span className="font-semibold">E-mail</span>
              <span className="text-slate-500">{profileForm.email || user.email}</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="space-y-1">
            <p className={labelSm}>Preferências rápidas</p>
            <h3 className="text-lg font-semibold text-slate-900">Tema, idioma e cores do app</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SurfaceCard className="border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tema</p>
              <p className="text-sm font-semibold text-slate-900">Claro</p>
            </SurfaceCard>
            <SurfaceCard className="border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Idioma</p>
              <p className="text-sm font-semibold text-slate-900">
                {languageOptions.find((item) => item.value === profileForm.preferredLanguage)?.label ?? 'Português'}
              </p>
            </SurfaceCard>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Cor principal</label>
            <input
              type="color"
              value={profileForm.primaryColor}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, primaryColor: event.target.value }))}
              className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-3 py-2"
            />
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 owner-grid-tight">
        <SurfaceCard className="space-y-4">
          <div className="space-y-1">
            <p className={labelSm}>Informações básicas</p>
            <h3 className="text-lg font-semibold text-slate-900">Atualize foto, contato e idioma</h3>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Nome completo</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Empresa</label>
                <input
                  type="text"
                  value={profileForm.companyName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, companyName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Cor principal</label>
                <input
                  type="color"
                  value={profileForm.primaryColor}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, primaryColor: event.target.value }))}
                  className="w-full h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                />
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">WhatsApp</label>
                <input
                  type="text"
                  value={profileForm.whatsappNumber}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Telefone</label>
                <input
                  type="text"
                  value={profileForm.contactPhone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Link do avatar (URL)</label>
                <input
                  type="url"
                  value={profileForm.avatarUrl}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  placeholder="https://..."
                />
                <div className="text-xs text-slate-500">
                  ou envie um arquivo:
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="mt-1 block w-full text-xs text-slate-600" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Preferências de tema</label>
                <select
                  value={profileForm.preferredTheme}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, preferredTheme: event.target.value as ThemeOption }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                >
                  {themeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Idioma preferido</label>
                <select
                  value={profileForm.preferredLanguage}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, preferredLanguage: event.target.value as LanguageOption }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {profileStatus && (
              <div
                className={`rounded-2xl border px-3 py-2 text-sm ${
                  profileStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                {profileStatus.message}
              </div>
            )}
            <button
              type="submit"
              disabled={pushNotifications.status === 'loading'}
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              Salvar perfil
            </button>
          </form>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="space-y-1">
            <p className={labelSm}>Segurança</p>
            <h3 className="text-lg font-semibold text-slate-900">Mantenha o acesso seguro</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-semibold">Senha atual</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 owner-grid-tight">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Nova senha</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Confirmar nova senha</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
            </div>
            {passwordStatus && (
              <div
                className={`rounded-2xl border px-3 py-2 text-sm ${
                  passwordStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                {passwordStatus.message}
              </div>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Atualizar senha
            </button>
          </form>
        </SurfaceCard>
      </div>
    </div>
  );
};

export default Profile;

