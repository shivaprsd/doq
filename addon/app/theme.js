
import { DOQ, filterRegEx } from "./config.js";
import { updateReaderColors } from "./reader.js";
import { readOptions, readPreferences, updatePreference } from "./prefs.js";

function updateReaderState(e) {
  const { config } = DOQ;
  const options = readOptions();
  const prefs = readPreferences();

  Object.assign(DOQ.flags, prefs.flags);
  config.imageToggle.checked = prefs.flags.imagesOn;
  config.shapeToggle.checked = prefs.flags.shapesOn;
  // A stored scheme index may no longer match colorSchemes (e.g. after
  // schemes were added/removed); fall back to the first scheme instead of
  // leaving the selector at -1 and crashing in updateColorScheme().
  const schemeIndex = prefs.scheme >= 0 && prefs.scheme < DOQ.colorSchemes.length
    ? prefs.scheme
    : 0;
  config.schemeSelector.selectedIndex = schemeIndex;

  const { dynamicTheme, filterCSS } = options;
  if (filterRegEx.test(filterCSS) && CSS.supports("filter", filterCSS)) {
    config.docStyle.setProperty("--filter-css", filterCSS);
  } else if (filterCSS !== "") {
    console.warn(`doq: unsupported filter property: "${filterCSS}"`);
  }
  if (!e || dynamicTheme) {
    updateColorScheme(e);
  }
}

function updateColorScheme(e) {
  const { config, options, preferences, colorSchemes } = DOQ;
  const index = config.schemeSelector.selectedIndex;
  const scheme = colorSchemes[index] ?? colorSchemes[0];

  if (!scheme?.tones || !scheme.tones.length) {
    return;
  }
  if (scheme.tones.length > 3) {
    console.warn("doq: can show up to three tones only; ignoring the rest.");
  }
  const picker = config.tonePicker;
  refreshTonePicker(picker, scheme);

  if (index !== preferences.scheme) {
    updatePreference("scheme", index);
    updatePreference("tone", "1");
  }
  const prefTone = (e || options.autoReader) ? preferences.tone : 0;
  picker.elements[prefTone].checked = true;
  updateReaderColors(e);
}

function refreshTonePicker(picker, scheme) {
  const toneWgt = picker.querySelector("template");
  picker.innerHTML = toneWgt.outerHTML;

  let i = 0;
  picker.appendChild(cloneWidget(toneWgt, "origTone", "Original", i++));
  scheme.tones.slice(0, 3).forEach(tone => {
    picker.appendChild(cloneWidget(toneWgt, null, null, i++, tone));
  });
  picker.appendChild(cloneWidget(toneWgt, "filterTone", "Filter", i));
  picker.lastElementChild.classList.add("filter");
}

function cloneWidget(template, id, title, value, tone) {
  const widget = template.content.cloneNode(true);
  const [input, label] = widget.children;

  title = title ?? tone.name;
  input.value = value;
  input.id = label.htmlFor = id ?? "tone" + title;
  input.setAttribute("aria-label", title);
  label.title = title;
  label.style.color = tone?.foreground;
  label.style.backgroundColor = tone?.background;
  return widget;
}

export { updateReaderState, updateColorScheme };
