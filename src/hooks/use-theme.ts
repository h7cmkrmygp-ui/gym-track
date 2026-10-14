import { Colors } from '@/constants/theme';

/** The app is always dark (black and champagne, from the logo), whatever the system setting. */
export function useTheme() {
  return Colors.dark;
}
