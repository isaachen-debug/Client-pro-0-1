import { createContext, useContext, useEffect } from 'react';

export type QuickActionKey = 'clients:add' | 'team:add-helper' | 'team:portal-access' | 'agenda:add';

type QuickActionContextValue = {
  registerQuickAction: (key: QuickActionKey, handler: () => void) => () => void;
};

const QuickActionContext = createContext<QuickActionContextValue | null>(null);

export const QuickActionProvider = QuickActionContext.Provider;

export const useRegisterQuickAction = (key: QuickActionKey, handler: () => void) => {
  const ctx = useContext(QuickActionContext);

  useEffect(() => {
    if (!ctx) return;
    return ctx.registerQuickAction(key, handler);
  }, [ctx, key, handler]);
};

export default QuickActionContext;

