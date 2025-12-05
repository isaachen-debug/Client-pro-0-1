import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellRing } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { LanguageOption, ThemeOption } from '../types';
import usePushNotifications from '../hooks/usePushNotifications';

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
    preferredTheme: (user?.preferredTheme ?? 'light') as ThemeOption,
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
        preferredTheme: (user.preferredTheme ?? 'light') as ThemeOption,
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

  const themeOptions: { value: ThemeOption; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
  ];

  const languageOptions: { value: LanguageOption; label: string }[] = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#040614] text-white shadow-[0_40px_120px_rgba(5,4,15,0.45)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#042f2e] opacity-90" />
        <div className="relative p-6 md:p-8 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-[28px] border border-white/20 bg-white/10 flex items-center justify-center text-2xl font-semibold text-white">
                {profileForm.avatarUrl ? (
                  <img src={profileForm.avatarUrl} alt={profileForm.name} className="h-full w-full object-cover rounded-[24px]" />
                ) : (
                  initials
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/60 font-semibold">Perfil principal</p>
                <h1 className="text-3xl md:text-4xl font-semibold">
                  {profileForm.companyName || profileForm.name || 'Atualize seu perfil'}
                </h1>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    Plano: {(user.planStatus ?? 'TRIAL').toUpperCase()}
                  </span>
                  {trialInfo && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1">
                      {trialInfo.daysLeft >= 0
                        ? `${trialInfo.daysLeft} dia(s) restantes`
                        : 'Período de testes encerrado'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto min-w-[260px]">
              <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 space-y-1">
                <p className="text-xs text-white/60 uppercase tracking-wide">Conta criada</p>
                <p className="text-lg font-semibold">
                  {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: ptBR }) : '—'}
                </p>
                <p className="text-xs text-white/60">{user.isActive ? 'Status: ativa' : 'Status: inativa'}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 space-y-2">
                <p className="text-xs text-white/60 uppercase tracking-wide flex items-center gap-2">
                  <BellRing size={14} />
                  Push notifications
                </p>
                <p className="text-sm font-semibold text-white">
                  {pushNotifications.status === 'enabled'
                    ? 'Ativas neste dispositivo'
                    : 'Ative alertas antes das rotas'}
                </p>
                {pushNotifications.status !== 'enabled' && (
                  <button
                    type="button"
                    onClick={pushNotifications.enable}
                    disabled={pushNotifications.status === 'loading'}
                    className="w-full inline-flex items-center justify-center rounded-2xl bg-white text-gray-900 px-3 py-1.5 text-xs font-semibold shadow-[0_10px_25px_rgba(15,23,42,0.3)] disabled:opacity-60"
                  >
                    {pushNotifications.status === 'loading' ? 'Ativando...' : 'Ativar agora'}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Personalize identidade e canais para helpers e clients.</p>
              {showHeroDetails && (
                <p className="text-xs text-white/70">
                  Atualize cores, contatos e preferências para manter o app consistente em todos os portais.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowHeroDetails((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80 border border-white/20 rounded-full px-3 py-1 hover:text-white hover:border-white/40 transition"
            >
              {showHeroDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-[0.3em]">Canais de contato</p>
              <h3 className="text-lg font-semibold text-gray-900">Como seus clientes falam com você</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {profileForm.whatsappNumber || profileForm.contactPhone ? 'Atualizado' : 'Pendentes'}
            </span>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-2">
              <span className="font-semibold">WhatsApp</span>
              <span className="text-gray-500">{profileForm.whatsappNumber || 'Adicionar número'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-2">
              <span className="font-semibold">Telefone</span>
              <span className="text-gray-500">{profileForm.contactPhone || 'Adicionar contato'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-2">
              <span className="font-semibold">E-mail</span>
              <span className="text-gray-500">{profileForm.email || user.email}</span>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)] p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-[0.3em]">Preferências rápidas</p>
            <h3 className="text-lg font-semibold text-gray-900">Tema, idioma e cores do app</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Tema</p>
              <p className="text-sm font-semibold text-gray-900">
                {profileForm.preferredTheme === 'dark' ? 'Escuro' : 'Claro'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Idioma</p>
              <p className="text-sm font-semibold text-gray-900">
                {languageOptions.find((item) => item.value === profileForm.preferredLanguage)?.label ?? 'Português'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-8 rounded-full border border-gray-200"
                style={{ backgroundColor: profileForm.primaryColor }}
              />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Cor principal</p>
                <p className="text-sm font-semibold text-gray-900">{profileForm.primaryColor.toUpperCase()}</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">Ajuste abaixo</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-[0.3em]">Identidade</p>
              <h2 className="text-2xl font-semibold text-gray-900">Informações da conta e visual</h2>
              <p className="text-sm text-gray-500">Esses dados aparecem no app interno e no portal do cliente.</p>
            </div>

            {profileStatus && (
              <div
                className={`text-sm px-4 py-2 rounded-xl ${
                  profileStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {profileStatus.message}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleProfileSubmit}>
              <div className="rounded-2xl border border-gray-100 bg-white/70 p-4 md:p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-[0.3em]">Dados pessoais</p>
                  <p className="text-sm text-gray-500">Informações usadas para login e comunicações internas.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-[0.3em]">Marca & contato</p>
                  <p className="text-sm text-gray-500">Dados exibidos no portal do cliente e para helpers.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome da empresa</label>
                    <input
                      type="text"
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))}
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Sunflowers Cleaning"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WhatsApp comercial</label>
                    <input
                      type="tel"
                      value={profileForm.whatsappNumber}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="(415) 555-0199"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone fixo / recados</label>
                    <input
                      type="tel"
                      value={profileForm.contactPhone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="(415) 555-0100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Logo / foto</label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-gray-500">{initials}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 cursor-pointer hover:border-primary-300">
                          Enviar imagem
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </label>
                        {profileForm.avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setProfileForm((prev) => ({ ...prev, avatarUrl: '' }))}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                        <p className="text-xs text-gray-500">PNG ou JPG até 2MB.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cor primária</label>
                    <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2">
                      <input
                        type="color"
                        value={profileForm.primaryColor}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-10 w-10 cursor-pointer bg-transparent"
                      />
                      <span className="text-sm font-semibold text-gray-700">{profileForm.primaryColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-[0.3em]">Experiência do app</p>
                  <p className="text-sm text-gray-500">Selecione idioma e tema padrão para toda a equipe.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tema preferido</label>
                    <select
                      value={profileForm.preferredTheme}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          preferredTheme: e.target.value as ThemeOption,
                        }))
                      }
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {themeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Idioma preferido</label>
                    <select
                      value={profileForm.preferredLanguage}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          preferredLanguage: e.target.value as LanguageOption,
                        }))
                      }
                      className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                  Conta criada em{' '}
                  <span className="font-semibold text-gray-700">
                    {user.createdAt ? format(new Date(user.createdAt), "dd 'de' MMMM yyyy", { locale: ptBR }) : '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex w-full md:w-auto items-center justify-center rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition"
                >
                  Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProfileForm({
                      name: user.name ?? '',
                      email: user.email ?? '',
                      companyName: user.companyName ?? '',
                      primaryColor: user.primaryColor ?? '#22c55e',
                      avatarUrl: user.avatarUrl ?? '',
                      preferredTheme: (user.preferredTheme ?? 'light') as ThemeOption,
                      preferredLanguage: (user.preferredLanguage ?? 'pt') as LanguageOption,
                      whatsappNumber: user.whatsappNumber ?? '',
                      contactPhone: user.contactPhone ?? '',
                    })
                  }
                  className="inline-flex w-full md:w-auto items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:border-gray-300 transition"
                >
                  Desfazer alterações
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-[0.3em]">Segurança</p>
              <h2 className="text-xl font-semibold text-gray-900">Alterar senha</h2>
              <p className="text-sm text-gray-500">Mantenha suas credenciais protegidas e atualizadas.</p>
            </div>

            {passwordStatus && (
              <div
                className={`text-sm px-4 py-2 rounded-xl ${
                  passwordStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {passwordStatus.message}
              </div>
            )}

            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Senha atual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova senha</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full mt-1 rounded-2xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full md:w-auto items-center justify-center rounded-2xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
              >
                Atualizar senha
              </button>
            </form>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-[0.3em]">Plano atual</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-gray-900">{(user.planStatus ?? 'TRIAL').toUpperCase()}</p>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {user.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
            {trialInfo && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
                <p>
                  Trial encerra em{' '}
                  <span className="font-semibold">
                    {format(trialInfo.end, "dd 'de' MMMM yyyy", { locale: ptBR })}
                  </span>
                </p>
                <p>{trialInfo.daysLeft >= 0 ? `${trialInfo.daysLeft} dia(s) restantes` : 'Período de testes encerrado'}</p>
              </div>
            )}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:border-primary-300 transition"
            >
              Gerenciar plano
            </button>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-[0.3em]">Checklist rápido</p>
              <h3 className="text-lg font-semibold text-gray-900">Deixe tudo pronto para o portal</h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                Envie uma logo quadrada e defina uma cor primária alinhada à sua marca.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                Preencha WhatsApp e telefone fixo para habilitar ações rápidas no app.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                Escolha idioma e tema preferidos — eles sincronizam com o portal do cliente.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Profile;

