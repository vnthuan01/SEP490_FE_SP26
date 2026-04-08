export type Variant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'purple'
  | 'pink'
  | 'teal';

export const variantStyles: Record<
  Variant,
  {
    card: string;
    icon: string;
    text: string;
    badge: string;
    hover: string;
  }
> = {
  default: {
    card: 'bg-card',
    icon: 'bg-muted text-muted-foreground',
    text: 'text-foreground',
    badge: 'bg-muted text-muted-foreground',
    hover: 'hover:bg-muted/40',
  },
  primary: {
    card: 'bg-primary/15 dark:bg-primary/10',
    icon: 'bg-primary/20 text-primary',
    text: 'text-primary',
    badge: 'bg-primary/20 text-primary',
    hover: 'hover:bg-primary/25 dark:hover:bg-primary/20',
  },
  success: {
    card: 'bg-emerald-500/15 dark:bg-emerald-500/10',
    icon: 'bg-emerald-500/20 text-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    hover: 'hover:bg-emerald-500/25 dark:hover:bg-emerald-500/20',
  },
  warning: {
    card: 'bg-orange-500/15 dark:bg-orange-500/10',
    icon: 'bg-orange-500/20 text-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
    hover: 'hover:bg-orange-500/25 dark:hover:bg-orange-500/20',
  },
  info: {
    card: 'bg-blue-500/15 dark:bg-blue-500/10',
    icon: 'bg-blue-500/20 text-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-500/25 dark:hover:bg-blue-500/20',
  },
  // 🔴 Danger (đỏ cảnh báo)
  danger: {
    card: 'bg-red-500/15 dark:bg-red-500/10',
    icon: 'bg-red-500/20 text-red-500',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500/20 text-red-600 dark:text-red-400',
    hover: 'hover:bg-red-500/25 dark:hover:bg-red-500/20',
  },

  // 🟣 Purple (modern dashboard)
  purple: {
    card: 'bg-violet-500/15 dark:bg-violet-500/10',
    icon: 'bg-violet-500/20 text-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    hover: 'hover:bg-violet-500/25 dark:hover:bg-violet-500/20',
  },

  // 🌸 Pink (highlight / marketing)
  pink: {
    card: 'bg-pink-500/15 dark:bg-pink-500/10',
    icon: 'bg-pink-500/20 text-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
    hover: 'hover:bg-pink-500/25 dark:hover:bg-pink-500/20',
  },

  // 🟢 Teal (analytics / system)
  teal: {
    card: 'bg-teal-500/15 dark:bg-teal-500/10',
    icon: 'bg-teal-500/20 text-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
    hover: 'hover:bg-teal-500/25 dark:hover:bg-teal-500/20',
  },
};
