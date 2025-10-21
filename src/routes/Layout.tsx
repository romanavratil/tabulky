import { useState } from 'react';
import { Flame, History, Plus, Settings, Sprout } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Sheet from '../components/ui/Sheet';
import AddFoodModal from '../components/add/AddFoodModal';

const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: Flame },
  { to: '/history', label: 'History', icon: History },
  { label: 'Add', icon: Plus, isCentral: true },
  { to: '/insights', label: 'Insights', icon: Sprout },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [showAddModal, setShowAddModal] = useState(false);
  const actionItem = NAV_ITEMS.find((item) => item.isCentral);
  const ActionIcon = actionItem?.icon;
  const itemBaseClasses =
    'flex h-12 flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 text-xs font-medium transition';

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-32 pt-6 md:px-6">
        <Outlet />
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="pointer-events-none mx-auto flex w-full max-w-md justify-center px-4">
          <nav
            aria-label="Main"
            className="pointer-events-auto flex w-full items-center justify-between gap-1 rounded-full border border-white/10 bg-surface/95 px-2 py-2 shadow-lg backdrop-blur"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              if (item.isCentral && ActionIcon) {
                return (
                  <button
                    key="quick-add"
                    type="button"
                    aria-label={showAddModal ? 'Close quick add' : 'Quick add'}
                    onClick={() => setShowAddModal((prev) => !prev)}
                    className={`${itemBaseClasses} flex-none px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-brand shadow-soft transition-transform duration-200 md:h-12 md:w-12"
                      style={{ transform: showAddModal ? 'rotate(45deg)' : 'rotate(0deg)' }}
                    >
                      <ActionIcon className="h-5 w-5 md:h-6 md:w-6" />
                    </span>
                  </button>
                );
              }
              return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  [
                    itemBaseClasses,
                    isActive ? 'text-brand' : 'text-muted hover:text-foreground',
                  ].join(' ')
                }
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          </nav>
        </div>
      </footer>
      <Sheet open={showAddModal} onClose={() => setShowAddModal(false)} title="Quick add">
        <AddFoodModal open={showAddModal} onClose={() => setShowAddModal(false)} />
      </Sheet>
    </div>
  );
}
