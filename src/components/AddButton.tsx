import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  label?: string;
};

export default function AddButton({ label = 'Add food' }: Props) {
  return (
    <Link
      to="/add"
      className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200"
      aria-label={label}
    >
      <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
      <span>{label}</span>
    </Link>
  );
}
