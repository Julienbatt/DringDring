"use client";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  SwatchIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

export default function ThemeSelector() {
  const { theme, colorScheme, setTheme, setColorScheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { key: 'light', label: 'Clair', icon: SunIcon, description: 'Mode clair' },
    { key: 'dark', label: 'Sombre', icon: MoonIcon, description: 'Mode sombre' },
    { key: 'auto', label: 'Auto', icon: ComputerDesktopIcon, description: 'Suivre le système' }
  ] as const;

  const colorSchemes = [
    { key: 'blue', label: 'Bleu', color: 'bg-blue-500', description: 'Thème professionnel' },
    { key: 'green', label: 'Vert', color: 'bg-green-500', description: 'Thème naturel' },
    { key: 'purple', label: 'Violet', color: 'bg-purple-500', description: 'Thème créatif' },
    { key: 'orange', label: 'Orange', color: 'bg-orange-500', description: 'Thème énergique' },
    { key: 'red', label: 'Rouge', color: 'bg-red-500', description: 'Thème dynamique' }
  ] as const;

  const getThemeIcon = (themeKey: string) => {
    const themeConfig = themes.find(t => t.key === themeKey);
    if (!themeConfig) return SunIcon;
    return themeConfig.icon;
  };

  const getColorSchemeColor = (schemeKey: string) => {
    const schemeConfig = colorSchemes.find(s => s.key === schemeKey);
    if (!schemeConfig) return 'bg-blue-500';
    return schemeConfig.color;
  };

  return (
    <div className="relative">
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
        title="Paramètres d'affichage"
      >
        <div className="flex items-center space-x-1">
          {isDark ? (
            <MoonIcon className="h-5 w-5" />
          ) : (
            <SunIcon className="h-5 w-5" />
          )}
          <div className={`w-3 h-3 rounded-full ${getColorSchemeColor(colorScheme)}`}></div>
        </div>
      </button>

      {/* Theme Selector Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Apparence
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Theme Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Mode d'affichage
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((themeOption) => {
                    const Icon = themeOption.icon;
                    const isSelected = theme === themeOption.key;
                    
                    return (
                      <button
                        key={themeOption.key}
                        onClick={() => setTheme(themeOption.key as any)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <Icon className={`h-5 w-5 ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                          }`} />
                          <span className={`text-xs font-medium ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {themeOption.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Scheme Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Couleur d'accent
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {colorSchemes.map((scheme) => {
                    const isSelected = colorScheme === scheme.key;
                    
                    return (
                      <button
                        key={scheme.key}
                        onClick={() => setColorScheme(scheme.key as any)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-gray-400 dark:border-gray-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        title={scheme.description}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className={`w-6 h-6 rounded-full ${scheme.color}`}></div>
                          <span className={`text-xs font-medium ${
                            isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {scheme.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <CheckIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Aperçu
                </h4>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full ${getColorSchemeColor(colorScheme)} flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">D</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        DringDring
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Mode {isDark ? 'sombre' : 'clair'} • {colorSchemes.find(s => s.key === colorScheme)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Les paramètres sont sauvegardés automatiquement
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



