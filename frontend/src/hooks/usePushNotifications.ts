import { useCallback, useState } from 'react';
import { notificationsApi } from '../services/api';

type PushStatus = 'idle' | 'loading' | 'enabled' | 'denied' | 'unsupported';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const usePushNotifications = () => {
  const [status, setStatus] = useState<PushStatus>('idle');

  const enable = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    try {
      setStatus('loading');

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = await notificationsApi.getPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await notificationsApi.saveSubscription(subscription);
      setStatus('enabled');
    } catch (error) {
      console.error('Erro ao ativar notificações', error);
      setStatus('idle');
    }
  }, []);

  return { status, enable };
};

export default usePushNotifications;

