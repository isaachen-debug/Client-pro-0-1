import { api } from './http';

type SubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export const notificationsApi = {
  async getPublicKey() {
    const { data } = await api.get<{ publicKey: string }>('/notifications/public-key');
    return data.publicKey;
  },

  async saveSubscription(subscription: PushSubscription) {
    const payload = subscription.toJSON() as SubscriptionPayload;
    await api.post('/notifications/subscribe', payload);
  },
};

