import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  toneClassName?: string;
  fullWidth?: boolean;
  children: ReactNode;
};

const PrimaryButton = ({
  loading = false,
  loadingText = 'Processando...',
  toneClassName = 'bg-primary-600 hover:bg-primary-700 text-white',
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: PrimaryButtonProps) => {
  const computedDisabled = disabled || loading;

  return (
    <motion.button
      type="button"
      whileTap={computedDisabled ? undefined : { scale: 0.98 }}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-60 disabled:cursor-not-allowed ${toneClassName} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
      disabled={computedDisabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      <span>{loading ? loadingText : children}</span>
    </motion.button>
  );
};

export default PrimaryButton;
