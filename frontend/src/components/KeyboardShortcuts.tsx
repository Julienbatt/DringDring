"use client";
import { useEffect, useState } from "react";
import { CommandLineIcon } from "@heroicons/react/24/outline";

type Shortcut = {
  key: string;
  description: string;
  action: () => void;
  category: string;
  icon: string;
};

type KeyboardShortcutsProps = {
  role: 'shop' | 'client';
  onNavigate?: (path: string) => void;
};

export default function KeyboardShortcuts({ role, onNavigate }: KeyboardShortcutsProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  useEffect(() => {
    const baseShortcuts: Shortcut[] = [
      {
        key: 'Ctrl + K',
        description: 'Recherche globale',
        action: () => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.click();
          }
        },
        category: 'Navigation',
        icon: '🔍'
      },
      {
        key: 'Ctrl + ?',
        description: 'Afficher les raccourcis',
        action: () => setIsHelpOpen(true),
        category: 'Aide',
        icon: '❓'
      },
      {
        key: 'Escape',
        description: 'Fermer les modales',
        action: () => {
          const modals = document.querySelectorAll('[role="dialog"]');
          modals.forEach(modal => {
            const closeButton = modal.querySelector('[data-dismiss="modal"]') as HTMLButtonElement;
            if (closeButton) closeButton.click();
          });
        },
        category: 'Navigation',
        icon: '❌'
      }
    ];

    // Raccourcis spécifiques au rôle
    const roleSpecificShortcuts: Record<'client' | 'shop', Shortcut[]> = {
      client: [
        {
          key: 'Ctrl + N',
          description: 'Nouvelle livraison',
          action: () => onNavigate?.('/delivery/new'),
          category: 'Actions',
          icon: '?z'
        },
        {
          key: 'Ctrl + D',
          description: 'Mes livraisons',
          action: () => onNavigate?.('/client/deliveries'),
          category: 'Navigation',
          icon: 'dYss'
        },
        {
          key: 'Ctrl + S',
          description: 'Mes statistiques',
          action: () => onNavigate?.('/client/stats'),
          category: 'Navigation',
          icon: 'dY"S'
        },
        {
          key: 'Ctrl + P',
          description: 'Mon profil',
          action: () => onNavigate?.('/client/profile'),
          category: 'Navigation',
          icon: 'dY`'
        }
      ],
      shop: [
        {
          key: 'Ctrl + N',
          description: 'Nouvelle livraison',
          action: () => onNavigate?.('/delivery/new'),
          category: 'Actions',
          icon: '?z'
        },
        {
          key: 'Ctrl + D',
          description: 'Mes livraisons',
          action: () => onNavigate?.('/shop/deliveries'),
          category: 'Navigation',
          icon: 'dYss'
        },
        {
          key: 'Ctrl + R',
          description: 'Rapports',
          action: () => onNavigate?.('/shop/reports'),
          category: 'Navigation',
          icon: 'dY"S'
        },
        {
          key: 'Ctrl + P',
          description: 'Profil magasin',
          action: () => onNavigate?.('/shop/profile'),
          category: 'Navigation',
          icon: 'dY?¦'
        }
      ]
    };
    const allShortcuts = [
      ...baseShortcuts,
      ...(roleSpecificShortcuts[role] || [])
    ];

    setShortcuts(allShortcuts);
  }, [role, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K pour la recherche
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.click();
        }
      }

      // Ctrl + ? pour l'aide
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault();
        setIsHelpOpen(true);
      }

      // Raccourcis spécifiques au rôle
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            onNavigate?.('/delivery/new');
            break;
          case 'd':
            e.preventDefault();
            if (role === 'client') onNavigate?.('/client/deliveries');
            else if (role === 'shop') onNavigate?.('/shop/deliveries');
            else if (role === 'hq_admin') onNavigate?.('/hq-admin/deliveries');
            break;
          case 's':
            e.preventDefault();
            if (role === 'client') onNavigate?.('/client/stats');
            else if (role === 'shop') onNavigate?.('/shop/reports');
            break;
          case 'r':
            e.preventDefault();
            if (role === 'shop') onNavigate?.('/shop/reports');
            break;
          case 'p':
            e.preventDefault();
            if (role === 'client') onNavigate?.('/client/profile');
            else if (role === 'shop') onNavigate?.('/shop/profile');
            break;
        }
      }

      // Escape pour fermer l'aide
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [role, onNavigate]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
        title="Raccourcis clavier (Ctrl + ?)"
      >
        <CommandLineIcon className="h-5 w-5" />
      </button>

      {/* Help Modal */}
      {isHelpOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50" 
            onClick={() => setIsHelpOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Raccourcis Clavier
                  </h3>
                  <button
                    onClick={() => setIsHelpOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Fermer</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 overflow-y-auto max-h-80">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{shortcut.icon}</span>
                            <span className="text-sm text-gray-700">
                              {shortcut.description}
                            </span>
                          </div>
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Appuyez sur <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">Escape</kbd> pour fermer
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}



