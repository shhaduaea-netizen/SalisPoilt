export const DATA_MODE: string = import.meta.env.VITE_DATA_MODE ?? 'demo';

/** Single switch that removes the dev-only demo role switcher from the UI. */
export const SHOW_DEMO_ROLE_SWITCHER = import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCHER === 'true';
