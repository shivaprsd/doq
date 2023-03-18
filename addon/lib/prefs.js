
import { DOQ, getDefaultPrefs } from "./config.js";

/* Preferences */
function readPreferences() {
  const prefs = getDefaultPrefs();
  const theme = getSysTheme();
  const store = JSON.parse(localStorage.getItem(`doq.preferences.${theme}`));

  for (const key in store) {
    const value = store[key];
    if (key in prefs && typeof value === typeof prefs[key]) {
      prefs[key] = value;
    }
  }
  DOQ.preferences = prefs;
  return prefs;
}

function updatePreference(key, value) {
  const prefs = DOQ.preferences;
  const theme = getSysTheme();

  if (key in prefs.flags) {
    prefs.flags[key] = DOQ.flags[key];
  } else if (key in prefs && typeof value === typeof prefs[key]) {
    prefs[key] = value;
  }
  localStorage.setItem(`doq.preferences.${theme}`, JSON.stringify(prefs));
}

function getSysTheme() {
  const { options, config } = DOQ;
  const light = !options.dynamicTheme || config.sysTheme.matches;
  return light ? "light" : "dark";
}

function readOptions() {
  const store = JSON.parse(localStorage.getItem("doq.options"));
  const { options } = DOQ;

  for (const key in options) {
    if (typeof options[key] === typeof store?.[key]) {
      options[key] = store[key];
    }
  }
  return options;
}

export { readOptions, readPreferences, updatePreference };
