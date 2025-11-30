"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = 'light' | 'dark' | 'auto';
type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

type ThemeContextType = {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('blue');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Charger les préférences depuis localStorage
    const savedTheme = localStorage.getItem('dringdring-theme') as Theme || 'light';
    const savedColorScheme = localStorage.getItem('dringdring-color-scheme') as ColorScheme || 'blue';
    
    setTheme(savedTheme);
    setColorScheme(savedColorScheme);

    // Appliquer le thème
    applyTheme(savedTheme, savedColorScheme);
  }, []);

  useEffect(() => {
    applyTheme(theme, colorScheme);
  }, [theme, colorScheme]);

  const applyTheme = (currentTheme: Theme, currentColorScheme: ColorScheme) => {
    const root = document.documentElement;
    
    // Déterminer si le mode sombre est actif
    let shouldBeDark = false;
    if (currentTheme === 'dark') {
      shouldBeDark = true;
    } else if (currentTheme === 'auto') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    setIsDark(shouldBeDark);

    // Appliquer les classes CSS
    root.classList.remove('light', 'dark');
    root.classList.add(shouldBeDark ? 'dark' : 'light');

    // Appliquer le schéma de couleurs
    root.classList.remove('blue', 'green', 'purple', 'orange', 'red');
    root.classList.add(currentColorScheme);

    // Sauvegarder les préférences
    localStorage.setItem('dringdring-theme', currentTheme);
    localStorage.setItem('dringdring-color-scheme', currentColorScheme);
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleSetColorScheme = (newScheme: ColorScheme) => {
    setColorScheme(newScheme);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      colorScheme,
      setTheme: handleSetTheme,
      setColorScheme: handleSetColorScheme,
      isDark
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}



