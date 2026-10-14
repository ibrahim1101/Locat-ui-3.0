/** Platform-settings deep link seam. Live adapter maps to Capacitor App settings intent / OS settings. */
export const Linking = {
  openSettings: () => window.dispatchEvent(new CustomEvent("locat:open-system-settings")),
};
