import TWPResponse from './twpResponse';

let nginx = false;

export default class TwitterProxy {
  static search(query, qf = true, ua = 0, login = false) {
    const url = nginx ? `/.proxy/search?f=tweets&src=typd&vertical=default&lang=en&ua=${encodeURIComponent(ua)}&q=${encodeURIComponent(query)}` : `/search.php?ua=${encodeURIComponent(ua)}&q=${encodeURIComponent(query)}${qf ? '' : '&noqf=1'}${login? '&login=1' : ''}`;
    return fetch(url)
      .then(TwitterProxy.checkSuccess)
      .then(TwitterProxy.parseSearchDOMString)
      .catch(TwitterProxy.handleError);
  }

  static user(screenName) {
    const url = nginx ? `/.proxy/${screenName}` : `/search.php?screenName=${screenName}`;
    return fetch(url)
      .then(TwitterProxy.checkSuccess)
      .then(TwitterProxy.parseDOMString)
      .catch(TwitterProxy.handleError);
  }
  
  static suggestions(screenName) {
    const url = nginx ? `/.proxy/i/search/typeahead.json?count=10&filters=false&q=%40${screenName}&result_type=users&src=SEARCH_BOX` : `/search.php?suggest=${screenName}`;
    return fetch(url)
      .then(TwitterProxy.checkSuccess)
      .then(TwitterProxy.parseJSON)
      .catch(TwitterProxy.handleError);
  }

  static status(id, screenName) {
    const url = nginx ? `/.proxy/${screenName}/status/${id}` : `/search.php?status=${id}`;
    return fetch(url)
      .then(TwitterProxy.checkSuccess)
      .then(TwitterProxy.parseDOMString)
      .catch(TwitterProxy.handleError);
  }

  static timelinePage(screenName, pos) {
    const posParam = pos ? (nginx ? `&max_position=${pos}` : `&pos=${pos}`) : '';
    const url = nginx ? `/.proxy/i/profiles/show/${screenName}/timeline/tweets?include_available_features=1&include_entities=1&lang=en${posParam}` : `/search.php?timeline=${screenName}${posParam}&replies=1`;
    return fetch(url)
      .then(TwitterProxy.checkSuccess)
      .then(TwitterProxy.parseInfinity)
      .catch(TwitterProxy.handleError);
  }

  static checkSuccess(res) {
    // res.ok === (res.status in the range 200-299)
    if (nginx && !res.ok && res.status != 404 || !nginx && !res.ok) {
      throw res; // throwing response object to make it available to catch()
    }
    return res;
  }

  static parseJSON = async (res) => {
    const json = await res.json();
    const twpResponse = new TWPResponse(res);
    twpResponse.json = json;
    return twpResponse;
  }

  static parseInfinity = async (res) => {
    const json = await res.json();
    const body = json.inner || json;
    const parser = new DOMParser();
    const twpResponse = new TWPResponse(res);
    twpResponse.more = body.has_more_items;
    twpResponse.dom = parser.parseFromString(body.items_html, 'text/html');
    const items = Array.from(twpResponse.dom.querySelectorAll('.js-stream-item'));
    const lastId = items.length > 0 ? items[items.length - 1].dataset.itemId : undefined;
    twpResponse.pos = body.min_position || lastId;
    return twpResponse;
  }

  /* eslint-disable no-param-reassign */
  static parseDOMString = async (res) => {
    const body = await res.text();
    const parser = new DOMParser();
    const twpResponse = new TWPResponse(res);
    twpResponse.bodyText = body;
    twpResponse.dom = parser.parseFromString(twpResponse.bodyText, 'text/html');
    return twpResponse;
  }
  /* eslint-enable no-param-reassign */

  /* eslint-disable no-param-reassign */
  static parseSearchDOMString = async (res) => {
    const body = await res.text();
    const parser = new DOMParser();
    const twpResponse = new TWPResponse(res);
    twpResponse.bodyText = body;
    twpResponse.dom = parser.parseFromString(twpResponse.bodyText, 'text/html');
    if (!twpResponse.dom.querySelector('.SidebarCommonModules')) {
      window.ui.unhandledError();
      throw new Error('Unexpected response from Twitter proxy');
    }
    return twpResponse;
  }
  /* eslint-enable no-param-reassign */

  /* eslint-disable no-console */
  static handleError(err) {
    switch (err.status) {
      case 404:
        console.warn(`[TwitterProxy|search] ${err.statusText}`);
        break;
      case 500:
        console.warn(`[TwitterProxy|search] ${err.statusText}`);
        break;
      default:
        console.warn('[TwitterProxy|search] Network error');
        break;
    }
    window.ui.unhandledError();
    throw err;
  }
}
