// Initialization order is intentional: later UI features extend earlier ones.
import initialize0 from "./i18n/dictionary.js";
import initialize1 from "./ui/notifications.js";
import initialize2 from "./ui/animations.js";
import initialize3 from "./core/application.js";
import initialize4 from "./ui/workspace.js";
import initialize5 from "./features/focus-room.js";
import initialize6 from "./ui/time-pickers.js";
import initialize7 from "./ui/progress-widget.js";
import initialize8 from "./ui/tooltips.js";
import initialize9 from "./features/settings.js";
import initialize10 from "./features/prayer-settings.js";
import initialize11 from "./ui/prayer-layout.js";
import initialize12 from "./ui/prayer-controls.js";
import initialize13 from "./features/prayer-reflections.js";
import initialize14 from "./ui/prayer-picker.js";
import initialize15 from "./ui/session-layout.js";
import initialize16 from "./features/about.js";
import initialize17 from "./i18n/dom-translator.js";
import initialize18 from "./ui/mobile-widgets.js";
import initialize19 from "./features/release-notes.js";

initialize0(); // i18n/dictionary
initialize1(); // ui/notifications
initialize2(); // ui/animations
initialize3(); // core/application
initialize4(); // ui/workspace
initialize5(); // features/focus-room
initialize6(); // ui/time-pickers
initialize7(); // ui/progress-widget
initialize8(); // ui/tooltips
initialize9(); // features/settings
initialize10(); // features/prayer-settings
initialize11(); // ui/prayer-layout
initialize12(); // ui/prayer-controls
initialize13(); // features/prayer-reflections
initialize14(); // ui/prayer-picker
initialize15(); // ui/session-layout
initialize16(); // features/about
initialize17(); // i18n/dom-translator
initialize18(); // ui/mobile-widgets
initialize19(); // features/release-notes
