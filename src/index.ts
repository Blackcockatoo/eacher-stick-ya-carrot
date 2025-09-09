import { initStickyCarrot } from './stickyCarrot'

// Initialize the Sticky Carrot mini game when the feature flag is enabled.
// Launch via Shift+G or the carrot icon in the footer.
if (import.meta.env?.VITE_FEATURE_STICKYACARROT === '1') {
  initStickyCarrot()
}

// Placeholder export until additional app code is added.
export const placeholder = true
