import type { LucideIcon } from 'lucide-react';

type QuickActionProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
};

export default function QuickAction({ icon: Icon, title, description, onClick }: QuickActionProps) {
  return (
    <button type="button" className="quick-action" onClick={onClick}>
      <Icon className="quick-icon" size={20} aria-hidden="true" />
      <span className="quick-action-copy">
        <b>{title}</b>
        <small>{description}</small>
      </span>
    </button>
  );
}
