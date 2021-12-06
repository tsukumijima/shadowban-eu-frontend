# Twitter Shadowban Tests (Frontend)

**One-page web app, testing Twitter users for various shadowbans.**

Frontend (this repository):   
[tsukumijima/shadowban-eu-frontend](https://github.com/tsukumijima/shadowban-eu-frontend)

Backend:   
[tsukumijima/shadowban-eu-backend](https://github.com/tsukumijima/shadowban-eu-backend)

## Setup

```bash
# Clone this repository
git clone https://github.com/tsukumijima/shadowban-eu-frontend.git
cd shadowban-eu-frontend

# Dependencies installation
npm install

# Development
npm run dev

# Build (to ./dist/)
npm run build
```

Some values, like the HTML base href, are hard-coded in `webpack.config.js`.

## Notes

#### Base href

The `<base href>` is set on build, depending on the `NODE_ENV`:

  - production: https://shadowban.eu/
  - development: http://127.0.0.1:9000/

The development value is taken from the `devServerConfig` object in `webpack.config.js`, including `basePath`.  
Be aware that setting `<base href>` to `http://127.0.0.1:9000/`, but then visiting the site via `http://localhost:9000/` will work at first, but the browser will deny setting the URL to http://localhost:9000/testedName, when running a test.
 
#### API mocks

During development, /src/api/ is included to have the webpack-dev-server serve API responses.

```
./src/api/
├── deboost
├── ghost
├── invalid
├── notweets
├── protected
└── typeahead
```

All these files hold one response object in JSON notation.
These files are served, whenever you test their respective name.
