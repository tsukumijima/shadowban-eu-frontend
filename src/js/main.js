/*
** Twitter QFD Shadowban Checker
** 2018-2020 @Netzdenunziant, @raphaelbeerlin
*/
import 'materialize-css';
import 'materialize-css/sass/materialize.scss';

import UI from './ui';
import TechInfo from './ui/TechInfo';
import I18N from './i18n';

import '../scss/style.scss';

let ui;

const fullTest = async (screenName) => {
  let response;
  try {
    response = await fetch(`./api/${screenName}`);
  } catch (err) {
    ui.updateTask({
      id: 'checkUser',
      status: 'warn',
      msg: I18N.getSingleValue('tasks:checkUser.result.failReason1')
    });
    return;
  }
  if (response.status === 429) {
    ui.updateTask({
      id: 'checkUser',
      status: 'warn',
      msg: I18N.getSingleValue('tasks:checkUser.result.failReason2')
    });
    return;
  }
  if (!response.ok) {
    ui.updateTask({
      id: 'checkUser',
      status: 'warn',
      msg: I18N.getSingleValue('tasks:checkUser.result.failReason3')
    });
    return;
  }
  const result = await response.json();
  // Convert case
  const _screenName = result.profile.screen_name;
  const userLink = `<a href="https://twitter.com/${_screenName}" rel="noopener noreferrer">@${_screenName}</a>`;

  let failReason;
  if (!result.profile.exists) {
    failReason = I18N.getSingleValue('tasks:checkUser.result.failReason4');
  } else if (result.profile.protected) {
    failReason = I18N.getSingleValue('tasks:checkUser.result.failReason5');
  } else if (result.profile.suspended) {
    failReason = I18N.getSingleValue('tasks:checkUser.result.failReason6');
  } else if (!result.profile.has_tweets) {
    failReason = I18N.getSingleValue('tasks:checkUser.result.failReason7');
  }

  if (failReason) {
    ui.updateTask({
      id: 'checkUser',
      status: 'warn',
      msg: `${userLink} ${failReason}`
    });
    return;
  }

  ui.updateTask({
    id: 'checkUser',
    status: 'ok',
    msg: `${userLink} ${I18N.getSingleValue('tasks:checkUser.result.ok')}`,
  });

  const resultsDefault = ['warn', I18N.getSingleValue('tasks:resultsDefault')];

  let typeaheadResult = resultsDefault;
  if (result.tests.typeahead === true) {
    typeaheadResult = ['ok', I18N.getSingleValue('tasks:checkSuggest.result.ok')];
  }
  if (result.tests.typeahead === false) {
    typeaheadResult = ['ban', I18N.getSingleValue('tasks:checkSuggest.result.ban')];
  }
  ui.updateTask({
    id: 'checkSuggest',
    status: typeaheadResult[0],
    msg: typeaheadResult[1]
  });

  let searchResult = resultsDefault;
  if (result.tests.search) {
    searchResult = ['ok', I18N.getSingleValue('tasks:checkSearch.result.ok')];
  }
  if (result.tests.search === false) {
    searchResult = ['ban', I18N.getSingleValue('tasks:checkSearch.result.ban')];
  }
  ui.updateTask({
    id: 'checkSearch',
    status: searchResult[0],
    msg: searchResult[1]
  });
  TechInfo.updateSearch(result);

  let threadResult = resultsDefault;
  if (result.tests.ghost.ban === false) {
    threadResult = ['ok', I18N.getSingleValue('tasks:checkConventional.result.ok')];
  } else if (result.tests.ghost.ban === true) {
    threadResult = ['ban', I18N.getSingleValue('tasks:checkConventional.result.ban')];
  }
  ui.updateTask({
    id: 'checkConventional',
    status: threadResult[0],
    msg: threadResult[1]
  });
  TechInfo.updateThread(result);

  let barrierResult = resultsDefault;
  if (result.tests.more_replies) {
    if (result.tests.more_replies.error === 'ENOREPLIES') {
      barrierResult = ['warn', I18N.getSingleValue('tasks:checkBarrier.result.warn', { screenName })];
    } else if (result.tests.more_replies.ban === false) {
      barrierResult = ['ok', I18N.getSingleValue('tasks:checkBarrier.result.ok')];
    } else if (result.tests.more_replies.ban === true) {
      const offensive = result.tests.more_replies.stage <= 0
        ? ''
        : I18N.getSingleValue('tasks:checkBarrier.result.offensive');
      barrierResult = ['ban', `${I18N.getSingleValue('tasks:checkBarrier.result.ban')}${offensive}`];
    }
  }
  if ('more_replies' in result.tests) {
    ui.updateTask({
      id: 'checkBarrier',
      status: barrierResult[0],
      msg: barrierResult[1]
    });
    TechInfo.updateBarrier(result);
  }
};

/* eslint-disable no-console */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('worker.js')
    .then(() => console.log('Service worker registered.'))
    .catch(err => console.log('Service worker not registered. This happened:', err));
}

// window.addEventListener('beforeinstallprompt', (e) => {
//   console.log('beforeinstallprompt');
//   e.prompt();
// });

/* eslint-enable no-console */

I18N.init().then(() => {
  ui = new UI();
  ui.test = fullTest;
  // init test by /?screenName
  ui.initFromLocation(window.location);
});
