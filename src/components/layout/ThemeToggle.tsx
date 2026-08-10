import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      onClick={toggleTheme}
      variant="secondary"
      size="icon"
      title={isDark ? 'Lightmode aktivieren' : 'Darkmode aktivieren'}
      aria-label={isDark ? 'Lightmode aktivieren' : 'Darkmode aktivieren'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
