/*
** Twitter QFD Shadowban Checker
** 2018 @Netzdenunziant (research), @raphaelbeerlin (implementation)
*/

import UI from './ui';
import TwitterProxy from './twProxy';

const enableDummyAccount = true;
const userAgentCount = 7; // Number of user agents defined in search.php

const tweetSearchSel = '.tweet.js-stream-tweet';

const findUserTweetLogin = async (query, name, qf, ua = 0, login = false) => {
  const testResponse = await TwitterProxy.search(query, qf, ua, login);
  const tweets = Array.from(testResponse.dom.querySelectorAll(tweetSearchSel));
  const usersTweets = tweets.filter(el =>
    el.dataset.screenName.toLowerCase() === name.toLowerCase()
  );
  return usersTweets.length > 0;
}

const findUserTweet = async (query, name, qf, ua = 0) => {
  const foundLoggedOut = await findUserTweetLogin(query, name, qf, ua);
  if(foundLoggedOut || !enableDummyAccount) {
    return [false, foundLoggedOut];
  }
  const foundLoggedIn = await findUserTweetLogin(query, name, qf, ua, true);
  return [true, foundLoggedIn];
}

// Test with multiple user agents
const multiTest = async (query, qf, success, prefUA = 0) => {
  const prefResponse = await TwitterProxy.search(query, qf, prefUA);
  const prefResult = success(prefResponse);
  if(prefResult) {
    return [prefUA, prefResult];
  }
  for(let ua = 0; ua < userAgentCount; ua++) {
    if(ua == prefUA) {
      continue;
    }
    const response = await TwitterProxy.search(query, qf, ua);
    const result = success(response);
	if(result) {
      return [ua, result];
    }
  }
  return [0, false];
}

const searchTimeline = async (user, success, pages = 10) => {
  let lastTweet;
  for(let i = 0; i < pages; i++) {
    const response = await TwitterProxy.timelinePage(user, lastTweet);
    lastTweet = response.pos;
    const result = await success(response);
    if(result) {
      return result;
    }
    if(!response.more) {
      return false;
    }
  }
  return false;
}

// Tests quality filter (v2) shadowban
const qfBanTest = async (screenName, result = {}, prefUA = 0) => {
  result.QFD = {};
  const linkTest = r => r.dom.querySelector(
    tweetSearchSel + ' a[href^="https://t.co/"],.tweet-text a[href^="http://t.co/"]'
  );
  const linkQuery = `from:${screenName} filter:links`;
  const [linkUA, linkAnchor] = await multiTest(linkQuery, true, linkTest, prefUA);
  result.QFD.method = 'link';
  result.QFD.foundTweets = !!linkAnchor;
  if(linkAnchor) {
    const linkRefId = linkAnchor.closest(tweetSearchSel).dataset.tweetId;
    result.QFD.tweetId = linkRefId;
    result.QFD.query = linkAnchor.href;

    window.ui.updateTask({
      id: 'getRefTweet',
      status: 'ok',
      msg: `Getting <a href="https://twitter.com/${screenName}/status/${linkRefId}">reference tweet</a>... OK!`
    }, {
      id: 'checkRefTweet',
      status: 'running',
      msg: `Trying to find <a href="https://twitter.com/${screenName}/status/${linkRefId}">reference tweet</a>...`
    });

    const [linkLogin, linkFoundNoQf] = await findUserTweet(linkAnchor.href, screenName, false, linkUA);
    result.QFD.login = linkLogin;
    if(linkFoundNoQf) {
      const linkFoundQf = await findUserTweetLogin(linkAnchor.href, screenName, true, linkUA, linkLogin);
      if(!linkFoundQf) {
        // tweet not fount - shadowban

        window.ui.updateTask({
          id: 'checkRefTweet',
          status: 'ban',
          msg: `<a href="https://twitter.com/${screenName}/status/${linkRefId}">Reference tweet</a> found <a href="https://twitter.com/search?f=tweets&vertical=default&q=${encodeURIComponent(linkAnchor.href)}&qf=off">without</a> ` +
            `but not found <a href="https://twitter.com/search?f=tweets&vertical=default&q=${encodeURIComponent(linkAnchor.href)}&qf=on">with</a> quality filter.<br />@${screenName} has a QFD shadowban!`
        });
        result.QFD.isBanned = true;
        return result;
      }
      // tweet found - no shadowban
      window.ui.updateTask({
        id: 'checkRefTweet',
        status: 'ok',
          msg: `<a href="https://twitter.com/${screenName}/status/${linkRefId}">Reference tweet</a> found without ` +
            `as well as with quality filter.<br />@${screenName} is not shadowbanned!`
      });
      result.QFD.isBanned = false;
      return result;
    }
  }
  
  result.QFD.method = 'image';
  const imageTest = r => r.dom.querySelector(tweetSearchSel + ' a.u-hidden');
  const [imageUA, imageAnchor] = await multiTest(`from:${screenName} filter:images`, true, imageTest, linkUA);
  result.QFD.foundTweets = !!imageAnchor;
  if(!imageAnchor) {
    window.ui.updateTask({
      id: ['checkRefTweet', 'getRefTweet'],
      status: 'warn',
      msg: `The QFD test needs least one tweet containing a link or an image.<br />@${screenName} could not be tested for QFD.`
    });
    delete result.QFD.login;
    delete result.QFD.tweetId;
    delete result.QFD.query;
    delete result.QFD.method;
    return result;
  }

  const imageRefId = imageAnchor.closest(tweetSearchSel).dataset.tweetId;
  result.QFD.tweetId = imageRefId;
  result.QFD.query = imageAnchor.innerText;
  const [imageLogin, imageFoundNoQf] = await findUserTweet(imageAnchor.innerText, screenName, false, imageUA);
  result.QFD.login = imageLogin;
  if(imageFoundNoQf) {
    const imageFoundQf = await findUserTweetLogin(imageAnchor.innerText, screenName, true, imageUA, imageLogin);
    if(!imageFoundQf) {
      // tweet not fount - shadowban

      window.ui.updateTask({
        id: 'checkRefTweet',
        status: 'ban',
        msg: `<a href="https://twitter.com/${screenName}/status/${imageRefId}">Reference tweet</a> found <a href="https://twitter.com/search?f=tweets&vertical=default&q=${encodeURIComponent(imageAnchor.href)}&qf=off">without</a> ` +
          `but not found <a href="https://twitter.com/search?f=tweets&vertical=default&q=${encodeURIComponent(imageAnchor.href)}&qf=on">with</a> quality filter.<br />@${screenName} has a QFD shadowban!`
      });
      result.QFD.isBanned = true;
      return result;
    }
    // tweet found - no shadowban
    window.ui.updateTask({
      id: 'checkRefTweet',
      status: 'ok',
        msg: `<a href="https://twitter.com/${screenName}/status/${imageRefId}">Reference tweet</a> found without ` +
          `as well as with quality filter.<br />@${screenName} is not shadowbanned!`
    });
    result.QFD.isBanned = false;
    return result;
  }

  window.ui.updateTask({
    id: ['checkRefTweet', 'getRefTweet'],
    status: 'warn',
    msg: `QFD tests failed.<br />@${screenName} could not be tested for QFD.`
  });
  delete result.QFD.login;
  delete result.QFD.tweetId;
  delete result.QFD.query;
  delete result.QFD.method;
  return result;
};

// Tests conventional (v1) shadowban
const searchBanTest = async (screenName) => {
  const tweetTest = r => r.dom.querySelector(tweetSearchSel);
  const [userUA, tweet] = await multiTest(`from:${screenName}`, false, tweetTest);
  return [userUA, !tweet];
};

const bannedInThread = async (screenName, id) => {
  const response = await TwitterProxy.status(id);
  const tweets = response.dom.querySelectorAll(
    '.permalink-inner .tweet:not([data-tweet-id="' + id + '"])');
  if(tweets.length == 0) {
    return [-1, null];
  }
  const replyId = tweets[0].dataset.tweetId;
  const replyResponse = await TwitterProxy.status(replyId);
  return [!replyResponse.dom.querySelector('.permalink-inner .tweet[data-tweet-id="' + id + '"]'),
    replyId];
}

const conventionalBanTest = async (screenName) => {
  const findRepliedTweet = async r => {
    const tweets = r.dom.querySelectorAll(`.tweet[data-screen-name="${screenName}"]`);
    for(let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      const count = tweet.querySelector('.ProfileTweet-actionCountForPresentation');
      if(count && parseInt(count.textContent.trim()) > 0) {
        const tweetId = tweet.dataset.tweetId;
        const [banned, replyId] = await bannedInThread(screenName, tweetId);
        if(banned === -1) {
          continue;
        }
        return [banned, tweetId, replyId];
      }
    }
    return false;
  };
  const response = await searchTimeline(screenName, findRepliedTweet);
  if(response === false) {
    return [-1, null, null];
  }
  return [response[0] | 0, response[1], response[2]];
}

const fullTest = async (screenName) => {
  const result = {};

  window.ui.updateTask({
    id: 'checkUser',
    status: 'running',
    msg: `Looking up @${screenName}`
  });

  // Check whether user exists at all
  const userResponse = await TwitterProxy.user(screenName);
  const nameEl = userResponse.dom.querySelector(".ProfileHeaderCard .username .u-linkComplex-target");
  result.exists = !!nameEl;
  if (!nameEl) {
    // user not found
    window.ui.updateTask({
      id: ['checkUser', 'checkSearch', 'checkConventional', 'getRefTweet', 'checkRefTweet'],
      status: 'ban',
      msg: `User <a href="https://twitter.com/${screenName}">@${screenName}</a> does not exist.`
    });
    return result;
  }
  screenName = nameEl.textContent;

  const tweet = userResponse.dom.querySelector(tweetSearchSel);
  result.hasTweets = !!tweet;
  result.canonicalName = screenName;
  window.ui.updateTask({
    id: 'checkUser',
    status: 'ok',
    msg: `Found <a href="https://twitter.com/${screenName}">@${screenName}</a>.`
  });

  // user found, but has no tweets
  if (!tweet) {
    window.ui.updateTask({
      id: ['checkSearch', 'checkConventional', 'getRefTweet', 'checkRefTweet'],
      status: 'ban',
      msg: `<a href="https://twitter.com/${screenName}">@${screenName}</a> hasn't made any tweets!<br />This test needs at least one tweet.`
    });
    return result;
  }

  // user found and has tweets
  window.ui.updateTask({
    id: 'checkSearch',
    status: 'running',
    msg: 'Testing search ban...'
  });

  // Check whether user is v1 banned; no need to test v2, if so
  const [userUA, isSearchBanned] = await searchBanTest(screenName);
  result.hasSearchBan = isSearchBanned;
  if (isSearchBanned) {
    window.ui.updateTask({
      id: ['checkSearch', 'getRefTweet', 'checkRefTweet'],
      status: 'ban',
      msg: `${screenName} has a 
        <a href="https://twitter.com/search/?f=tweets&vertical=default&q=` +
        `${encodeURIComponent('from:' + screenName)}">search ban</a>!`
    }, {
      id: 'checkConventional',
      status: 'running',
      msg: 'Testing conventional shadowban...'
    });

    const [isConventionalBanned, convTweet, convReply] = await conventionalBanTest(screenName);
    if(isConventionalBanned == 0) {
      window.ui.updateTask({
        id: 'checkConventional',
        status: 'ok',
        msg: `${screenName} doesn't have a conventional shadowban.`
      });
      result.hasConventionalBan = false;
    } else if(isConventionalBanned == 1) {
      window.ui.updateTask({
        id: 'checkConventional',
        status: 'ban',
        msg: `${screenName} has a conventional shadowban! Have a look at ` +
          `<a href="https://twitter.com/${screenName}/status/${convReply}">this tweet</a> ` +
          `within <a href="https://twitter.com/${screenName}/status/${convTweet}">this thread</a>.`
      });
      result.hasConventionalBan = true;
    } else {
      window.ui.updateTask({
        id: 'checkConventional',
        status: 'warn',
        msg: `${screenName} couldn't be tested for a conventional shadowban.`
      });
    }
    return result;
  }

  result.hasConventionalBan = false;
  window.ui.updateTask({
    id: 'checkSearch',
    status: 'ok',
    msg: `${screenName} doesn't have a search ban.`
  }, {
    id: 'getRefTweet',
    status: 'running',
    msg: 'Getting reference tweet for quality filter shadowban...'
  }, {
    id: 'checkConventional',
    status: 'ok',
    msg: `${screenName} doesn't have a conventional shadowban.`
  });

  // Check v2 shadowban; UI updates inside (POLA violation, I know :P)
  return qfBanTest(screenName, result, userUA);
}

document.addEventListener('DOMContentLoaded', () => {
  window.ui = new UI(fullTest);
  window.fullTest = fullTest;
});
