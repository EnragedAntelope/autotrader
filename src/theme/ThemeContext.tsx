import { createContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material';
import { grey, blue, green, red } from '@mui/material/colors';

interface ThemeContextType {
  toggleTheme: () => void;
  mode: PaletteMode;
}

export const ThemeContext = createContext<ThemeContextType>({
  toggleTheme: () => {},
  mode: 'light',
});

export function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('theme-mode');
    return (saved as PaletteMode) || 'light';
  });

  useEffect(() => {
    // Save theme to localStorage when it changes
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode palette
                primary: {
                  main: blue[700],
                },
                secondary: {
                  main: green[700],
                },
                error: {
                  main: red[600],
                },
                background: {
                  default: grey[50],
                  paper: '#ffffff',
                },
              }
            : {
                // Dark mode palette
                primary: {
                  main: blue[400],
                },
                secondary: {
                  main: green[400],
                },
                error: {
                  main: red[400],
                },
                background: {
                  default: '#0a1929',
                  paper: '#001e3c',
                },
              }),
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
