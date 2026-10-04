import { useWindowDimensions } from 'react-native';
import { duePannelli, layoutLargo } from '@/lib/layout';

/**
 * Whether the window is wide enough for the tablet layout.
 *
 * It reads the WINDOW, not the screen: on an iPad the app can live in a
 * resizable window, and turning the device changes the answer too. Both
 * re-render through `useWindowDimensions`.
 */
export function useLayoutLargo(): boolean {
  const { width } = useWindowDimensions();
  return layoutLargo(width);
}

/** Whether the window is wide enough for list and detail side by side. */
export function useDuePannelli(): boolean {
  const { width } = useWindowDimensions();
  return duePannelli(width);
}
