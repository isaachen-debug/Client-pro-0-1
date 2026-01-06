import { LayoutGroup, motion } from 'framer-motion';
import { useId } from 'react';

type AnimatedTabsOption<T extends string> = {
  value: T;
  label: string;
};

type AnimatedTabsProps<T extends string> = {
  options: AnimatedTabsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  indicatorClassName?: string;
  size?: 'sm' | 'md';
};

const paddingBySize: Record<NonNullable<AnimatedTabsProps<string>['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

const AnimatedTabs = <T extends string>({
  options,
  value,
  onChange,
  className,
  indicatorClassName = 'bg-slate-900 shadow-sm',
  size = 'md',
}: AnimatedTabsProps<T>) => {
  const groupId = useId();
  const padding = paddingBySize[size];

  return (
    <LayoutGroup id={groupId}>
      <div
        className={`relative inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur-sm ${className ?? ''}`}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative overflow-hidden rounded-full font-semibold transition-colors ${padding} ${
                isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              whileTap={isActive ? undefined : { scale: 0.97 }}
            >
              {isActive ? (
                <motion.span
                  layoutId={`${groupId}-indicator`}
                  className={`absolute inset-0 rounded-full ${indicatorClassName}`}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                />
              ) : null}
              <span className="relative z-10">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
};

export default AnimatedTabs;
