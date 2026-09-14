import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      // Clean up legacy automatic dark theme if present
      const legacyTheme = localStorage.getItem('app_theme');
      if (legacyTheme === 'dark') {
        localStorage.removeItem('app_theme');
      }

      // Check if user explicitly chose a theme previously
      const savedTheme = localStorage.getItem('proworkflow_user_selected_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // ignore
    }
    // Default to light mode upon opening page
    return 'light';
  });

  const isDarkMode = theme === 'dark';

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('proworkflow_user_selected_theme', newTheme);
      localStorage.setItem('app_theme', newTheme);
    } catch {
      // ignore
    }
  };

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
