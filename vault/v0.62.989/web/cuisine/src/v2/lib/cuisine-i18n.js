// Moved to web/_shared/lib/cuisine-i18n.js at v0.62.896.
//
// The table lived here and was hand-copied into web/clipboard/src/lib/cuisine-i18n.js;
// the copy fell three locales and one whole table behind. This file stays as a
// re-export so the imports in this app keep their existing paths, and so that a
// future reader who greps for the old location lands on the reason rather than on
// nothing. Add locales in _shared, never here.
export { cuisineName, restaurantTypeName } from '../../../../_shared/lib/cuisine-i18n.js';
