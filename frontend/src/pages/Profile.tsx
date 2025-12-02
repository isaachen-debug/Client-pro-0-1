import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { LanguageOption, ThemeOption } from '../types';

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
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Perfil do Usuário</h1>
        <p className="text-sm text-gray-500">Gerencie suas informações pessoais e preferências de acesso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Informações básicas</h2>
              <p className="text-sm text-gray-500">Atualize seu nome e e-mail principal.</p>
            </div>

            {profileStatus && (
              <div
                className={`text-sm px-4 py-2 rounded-lg ${
                  profileStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {profileStatus.message}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa</label>
                <input
                  type="text"
                  value={profileForm.companyName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Ex: Brilho&Limpeza"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp comercial</label>
                  <input
                    type="tel"
                    value={profileForm.whatsappNumber}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    placeholder="(11) 90000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone fixo / recados</label>
                  <input
                    type="tel"
                    value={profileForm.contactPhone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    placeholder="(11) 4002-8922"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
                  <div className="flex items-center space-x-3 border border-gray-200 rounded-lg px-4 py-2">
                    <input
                      type="color"
                      value={profileForm.primaryColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-10 h-10 border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{profileForm.primaryColor.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo / foto</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                      {profileForm.avatarUrl ? (
                        <img src={profileForm.avatarUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-500 font-semibold">{initials}</span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <label className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:border-primary-300">
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
                      <p className="text-xs text-gray-500 mt-1">PNG ou JPG até 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema preferido</label>
                  <select
                    value={profileForm.preferredTheme}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        preferredTheme: e.target.value as ThemeOption,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    {themeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idioma preferido</label>
                  <select
                    value={profileForm.preferredLanguage}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        preferredLanguage: e.target.value as LanguageOption,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Conta criada em {user.createdAt ? format(new Date(user.createdAt), "dd 'de' MMMM yyyy", { locale: ptBR }) : '-'}
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Salvar alterações
              </button>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Alterar senha</h2>
              <p className="text-sm text-gray-500">Defina uma senha segura para proteger sua conta.</p>
            </div>

            {passwordStatus && (
              <div
                className={`text-sm px-4 py-2 rounded-lg ${
                  passwordStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {passwordStatus.message}
              </div>
            )}

            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Atualizar senha
              </button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Plano</h3>
              <p className="text-2xl font-bold text-gray-900">{user.planStatus ?? 'TRIAL'}</p>
            </div>
            {trialInfo && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  Trial encerra em{' '}
                  <span className="font-semibold">
                    {format(trialInfo.end, "dd 'de' MMMM yyyy", { locale: ptBR })}
                  </span>
                </p>
                <p>
                  {trialInfo.daysLeft >= 0
                    ? `${trialInfo.daysLeft} dia(s) restantes`
                    : 'Período de testes encerrado'}
                </p>
              </div>
            )}
            <div className="text-sm text-gray-600">
              Status:{' '}
              <span
                className={`font-semibold ${
                  user.isActive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {user.isActive ? 'Conta ativa' : 'Conta desativada'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Profile;

