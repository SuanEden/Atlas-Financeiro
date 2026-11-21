import { ArrowUpRight, ListTodo } from 'lucide-react';

const nexoTasksUrl = 'https://script.google.com/macros/s/AKfycbzN980rOIZbFsRtUJLpqGn6g-L97QCcYVYFGw3GANwTSJTbOFhpRTrhoTY8Sw-MFR8f/exec';

const appearances = {
  sidebar: {
    linkClass: 'sidebar-cloud-link sidebar-tool-link',
    iconClass: 'sidebar-cloud-link-icon',
    copyClass: 'sidebar-cloud-link-copy',
    arrowClass: 'sidebar-cloud-link-chevron',
    iconSize: 19,
    arrowSize: 17,
  },
  menu: {
    linkClass: undefined,
    iconClass: 'more-menu-icon',
    copyClass: undefined,
    arrowClass: undefined,
    iconSize: 20,
    arrowSize: 20,
  },
  quickAction: {
    linkClass: 'dashboard-mobile-tool',
    iconClass: 'quick-action-icon',
    copyClass: undefined,
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
      <span className={appearance.iconClass}><ListTodo size={appearance.iconSize} aria-hidden="true" /></span>
      {placement === 'quickAction' ? <span>Nexo Tasks</span> : (
        <span className={appearance.copyClass}><strong>Nexo Tasks</strong><small>Organizador de tarefas</small></span>
      )}
      <ArrowUpRight className={appearance.arrowClass} size={appearance.arrowSize} aria-hidden="true" />
    </a>
  );
}
