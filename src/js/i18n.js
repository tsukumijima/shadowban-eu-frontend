/* eslint-disable no-console */
/* global i18nVersions */
import i18next from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import XHRBackend from 'i18next-xhr-backend';
import BrowserLanguageDetector from 'i18next-browser-languagedetector';

// add detector
// ref https://github.com/i18next/i18next-browser-languageDetector/blob/master/src/browserLookups/navigator.js
const navigatorEx = {
  name: 'navigator-ex',

  lookup(options) {

    // display in Japanese for Google crawlers
    if (navigator.userAgent.match(/Googlebot/)) {
      return ['ja'];
    }

    let found = [];

    if (typeof navigator !== 'undefined') {
      if (navigator.languages) { // chrome only; not an array, so can't use .push.apply instead of iterating
        for (let i=0; i < navigator.languages.length; i++) {
          found.push(navigator.languages[i]);
        }
      }
      if (navigator.userLanguage) {
        found.push(navigator.userLanguage);
      }
      if (navigator.language) {
        found.push(navigator.language);
      }
    }

    found = found.filter(word => !word.includes('-'));
    return found.length > 0 ? found : undefined;
  }
};
const browserLanguageDetector = new BrowserLanguageDetector();
browserLanguageDetector.addDetector(navigatorEx);

export default class I18N {
  static async init() {
    await i18next
      .use(ChainedBackend)
      .use(browserLanguageDetector)
      .init({
        fallbackLng: 'en',
        detection: {
          order: ['navigator-ex'],
        },
        debug: process.env.NODE_ENV === 'development',
        ns: ['common', 'tasks', 'functionality', 'techinfo'],
        defaultNS: 'common',
        backend: {
          backends: [LocalStorageBackend, XHRBackend],
          backendOptions: [
            {
              // LocalStorageBackend options
              versions: i18nVersions
            },
            {
              // XHRBackend options
              loadPath: './i18n/{{lng}}/{{ns}}.json',
              crossDomain: false
            }
          ]
        }
      });

    I18N.setInterpolationDefaults();

    // i18next.on('languageChanged', () => {
    //   I18N.resetElements();
    // });
  }

  static setInterpolationDefaults() {
    i18next.options.interpolation.defaultVariables = {
      screenName: 'username'
    };
  }

  static changeLng(lng) {
    i18next.changeLanguage(lng);
  }

  static getSingleValue(key, options = {}) {
    return i18next.t(key, options);
  }

  /**
   * Sets innerHTML of an `element` to the
   * text/translation of that target's .dataset.i18n value
   * @param {HTMLElement} ...elements - Elements whose text shall be set
   */
  static updateElements(...elements) {
    elements.forEach((el) => {
      el.innerHTML = i18next.t(el.dataset.i18n); // eslint-disable-line
    });
  }

  static updateWithInterpolation(element, interpolation) {
    element.innerHTML = i18next.t(element.dataset.i18n, interpolation); // eslint-disable-line
  }

  static resetElements() {
    I18N.updateElements(...Array.from(document.querySelectorAll('[data-i18n]')));
    const tEndHandler = ({ target }) => {
      target.classList.remove('loadable');
      target.removeEventListener('transitionend', tEndHandler);
    };
    Array.from(document.querySelectorAll('.loadable.loading'))
      .forEach((element) => {
        element.addEventListener('transitionend', tEndHandler);
        element.classList.remove('loading');
      });
  }
}
