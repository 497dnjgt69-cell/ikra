// Initialization order is intentional: later UI features extend earlier ones.
import initLanguage from "./i18n/dictionary.js";
import initNotifications from "./ui/notifications.js";
import initAnimations from "./ui/animations.js";
import createApplication from "./core/application.js";
import initWorkspace from "./ui/workspace.js";
import initFocusRoom from "./features/focus-room.js";
import initTimePickers from "./ui/time-pickers.js";
import initProgressWidget from "./ui/progress-widget.js";
import initTooltips from "./ui/tooltips.js";
import initSettingsLayout from "./features/settings.js";
import initPrayerSettings from "./features/prayer-settings.js";
import initPrayerLayout from "./ui/prayer-layout.js";
import initPrayerControls from "./ui/prayer-controls.js";
import initPrayerReflections from "./features/prayer-reflections.js";
import initPrayerPicker from "./ui/prayer-picker.js";
import initSessionLayout from "./ui/session-layout.js";
import initAbout from "./features/about.js";
import initTranslation from "./i18n/dom-translator.js";
import initMobileWidgets from "./ui/mobile-widgets.js";
import initReleaseNotes from "./features/release-notes.js";

export function bootstrap(options) {
  initLanguage(); // i18n/dictionary
  initNotifications(); // ui/notifications
  initAnimations(); // ui/animations
  const app = createApplication(options); // services and views
  initWorkspace(); // ui/workspace
  initFocusRoom({ access: app.access }); // features/focus-room
  initTimePickers({
    getWidgetPositions: () => app.store.state.widgetPositions,
  }); // ui/time-pickers
  initProgressWidget(); // ui/progress-widget
  initTooltips(); // ui/tooltips
  initSettingsLayout(); // features/settings
  initPrayerSettings(); // features/prayer-settings
  initPrayerLayout(); // ui/prayer-layout
  initPrayerControls(); // ui/prayer-controls
  initPrayerReflections(); // features/prayer-reflections
  initPrayerPicker(); // ui/prayer-picker
  initSessionLayout(); // ui/session-layout
  initAbout(); // features/about
  initTranslation(); // i18n/dom-translator
  initMobileWidgets(); // ui/mobile-widgets
  initReleaseNotes(); // features/release-notes

  return app;
}
