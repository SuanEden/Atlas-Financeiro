import { ArrowUpRight, ListTodo } from 'lucide-react';

const nexoTasksUrl = 'https://script.google.com/macros/s/AKfycbzN980rOIZbFsRtUJLpqGn6g-L97QCcYVYFGw3GANwTSJTbOFhpRTrhoTY8Sw-MFR8f/exec';

const appearances = {
  sidebar: {
    linkClass: 'sidebar-tool-link',
    arrowClass: undefined,
    iconSize: 19,
    arrowSize: 17,
  },
  menu: {
    linkClass: 'more-menu-tool',
    arrowClass: undefined,
    iconSize: 20,
    arrowSize: 20,
  },
  quickAction: {
    linkClass: 'dashboard-mobile-tool',
    arrowClass: 'quick-action-external',
    iconSize: 19,
    arrowSize: 14,
  },
} as const;

export function NexoTasksLink({ placement }: { placement: keyof typeof appearances }) {
  const appearance = appearances[placement];

  return (
    <a className={appearance.linkClass} href={nexoTasksUrl} target="_blank" rel="noopener noreferrer"
      aria-label="Nexo Tasks, abre em nova aba">
      <span><ListTodo size={appearance.iconSize} aria-hidden="true" /></span>
      <span>Nexo Tasks</span>
      <ArrowUpRight className={appearance.arrowClass} size={appearance.arrowSize} aria-hidden="true" />
    </a>
  );
}
