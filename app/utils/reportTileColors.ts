// Static literal class strings (Tailwind's JIT scanner needs the full
// class name to appear in source — no `bg-${color}-50` template building)
// for a report tile's icon block, keyed by the same accent hues SidebarNav
// uses for its nav groups so a report's icon color ties back to its
// category's sidebar color at a glance.
const TILE_ICON_CLASSES: Record<string, string> = {
  sky: 'bg-sky-50 dark:bg-sky-400/10 text-sky-500 dark:text-sky-300',
  violet: 'bg-violet-50 dark:bg-violet-400/10 text-violet-500 dark:text-violet-300',
  teal: 'bg-teal-50 dark:bg-teal-400/10 text-teal-500 dark:text-teal-300',
  orange: 'bg-orange-50 dark:bg-orange-400/10 text-orange-500 dark:text-orange-300',
  emerald: 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-500 dark:text-emerald-300',
  indigo: 'bg-indigo-50 dark:bg-indigo-400/10 text-indigo-500 dark:text-indigo-300',
  rose: 'bg-rose-50 dark:bg-rose-400/10 text-rose-500 dark:text-rose-300'
}
const DEFAULT_TILE_ICON_CLASSES = 'bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300'

export function tileIconClasses(color?: string): string {
  return (color && TILE_ICON_CLASSES[color]) || DEFAULT_TILE_ICON_CLASSES
}

// Same accent hues, styled as a colored pill outline+text (for the /reports
// jump-nav bar) instead of an icon block.
const TILE_PILL_CLASSES: Record<string, string> = {
  sky: 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-400/10 border-sky-200 dark:border-sky-800 hover:border-sky-400',
  violet: 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-400/10 border-violet-200 dark:border-violet-800 hover:border-violet-400',
  teal: 'text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-400/10 border-teal-200 dark:border-teal-800 hover:border-teal-400',
  orange: 'text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-400/10 border-orange-200 dark:border-orange-800 hover:border-orange-400',
  emerald: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400',
  indigo: 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-400/10 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400',
  rose: 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-400/10 border-rose-200 dark:border-rose-800 hover:border-rose-400'
}
const DEFAULT_TILE_PILL_CLASSES =
  'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-400'

export function tilePillClasses(color?: string): string {
  return (color && TILE_PILL_CLASSES[color]) || DEFAULT_TILE_PILL_CLASSES
}
