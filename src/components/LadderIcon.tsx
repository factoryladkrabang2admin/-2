import { createLucideIcon } from 'lucide-react';

/**
 * A-Frame Ladder Icon (บันไดทรง A)
 * Follows Lucide's standard 24x24 grid, strokeWidth, strokeLinecap, strokeLinejoin.
 */
export const Ladder = createLucideIcon('ladder', [
  ['path', { d: 'M9 3h6', key: 'ladder-top' }],
  ['path', { d: 'M10 3 4.5 21', key: 'ladder-left' }],
  ['path', { d: 'M14 3 19.5 21', key: 'ladder-right' }],
  ['path', { d: 'M8.6 7.5h6.8', key: 'ladder-rung-1' }],
  ['path', { d: 'M7.3 12h9.4', key: 'ladder-rung-2' }],
  ['path', { d: 'M5.9 16.5h12.2', key: 'ladder-rung-3' }],
]);

export default Ladder;
