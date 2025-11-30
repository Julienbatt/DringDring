"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

type SearchResult = {
  id: string;
  type: 'delivery' | 'client' | 'shop' | 'user' | 'report';
  title: string;
  description: string;
  url: string;
  icon: string;
  metadata?: {
    status?: string;
    date?: string;
    amount?: number;
    role?: string;
  };
};

type GlobalSearchProps = {
  role: string;
  onResultClick?: (result: SearchResult) => void;
};

export default function GlobalSearch({ role, onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Simulation de données de recherche
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'delivery',
      title: 'Livraison #DEL-001',
      description: 'Marie Dubois - Metropole Migros Sion - 15 CHF',
      url: '/shop/deliveries',
      icon: '🚚',
      metadata: {
        status: 'En cours',
        date: '2025-01-10',
        amount: 15
      }
    },
    {
      id: '2',
      type: 'client',
      title: 'Marie Dubois',
      description: 'Client - 5 livraisons - 75 CHF total',
      url: '/shop/clients',
      icon: '👤',
      metadata: {
        role: 'client'
      }
    },
    {
      id: '3',
      type: 'shop',
      title: 'Metropole Migros Sion',
      description: 'Place de la Gare 5, 1950 Sion',
      url: '/hq-admin/shops',
      icon: '🏪',
      metadata: {
        status: 'Actif'
      }
    },
    {
      id: '4',
      type: 'report',
      title: 'Rapport mensuel Janvier 2025',
      description: '25 livraisons - 375 CHF de revenus',
      url: '/shop/reports',
      icon: '📊',
      metadata: {
        date: '2025-01-10'
      }
    },
    {
      id: '5',
      type: 'user',
      title: 'Jean Dupont',
      description: 'HQ Admin - Migros Valais',
      url: '/hq-admin/users',
      icon: '👨‍💼',
      metadata: {
        role: 'hq_admin'
      }
    }
  ];

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulation de recherche avec délai
    const timeout = setTimeout(() => {
      const filteredResults = mockResults.filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      );
      
      setResults(filteredResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setQuery("");
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else {
      window.location.href = result.url;
    }
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'delivery':
        return 'Livraison';
      case 'client':
        return 'Client';
      case 'shop':
        return 'Magasin';
      case 'user':
        return 'Utilisateur';
      case 'report':
        return 'Rapport';
      default:
        return 'Résultat';
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'delivery':
        return 'bg-green-100 text-green-800';
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'shop':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-orange-100 text-orange-800';
      case 'report':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={`Rechercher dans ${role === 'client' ? 'mes livraisons' : 'la plateforme'}...`}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (query.length >= 2) && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Results Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Recherche en cours...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Aucun résultat trouvé pour "{query}"</p>
                <p className="text-sm mt-1">Essayez avec d'autres mots-clés</p>
              </div>
            ) : (
              <div ref={resultsRef} className="py-1">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      index === selectedIndex 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{result.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getResultTypeColor(result.type)}`}>
                            {getResultTypeLabel(result.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {result.description}
                        </p>
                        {result.metadata && (
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            {result.metadata.status && (
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                {result.metadata.status}
                              </span>
                            )}
                            {result.metadata.date && (
                              <span>📅 {result.metadata.date}</span>
                            )}
                            {result.metadata.amount && (
                              <span>💰 {result.metadata.amount} CHF</span>
                            )}
                            {result.metadata.role && (
                              <span>👤 {result.metadata.role}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Utilisez ↑↓ pour naviguer, Entrée pour sélectionner, Échap pour fermer
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}



