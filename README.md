# Twitter Shadowban Test (Frontend)

**One-page web app, testing Twitter users for various shadowbans.**

Frontend (this repository):   
[tsukumijima/shadowban-eu-frontend](https://github.com/tsukumijima/shadowban-eu-frontend)

Backend:   
[tsukumijima/shadowban-eu-backend](https://github.com/tsukumijima/shadowban-eu-backend)

## About this fork

In this fork, we have made various improvements, such as tidying up the code and updating dependencies.

Node.js has been migrated and updated to Node.js 14, npm to npm 7, and webpack to webpack 5.  
In connection with this, there are some changes in the configuration of some packages.  
Also, webpack.config.js has been changed to support webpack 5.

In addition, we have cleaned up the code and added Japanese translation.  
The code itself was prepared to be multilingualized, but the translation files were only available in English.  
We applied this composition and moved the English hard-coded parts to the translation files, so that can be displayed in Japanese when the browser requires Japanese.

## Setup

Beforehand, Node.js 14 and npm 7 must be installed.

Run the following commands in order.

```bash
# Clone this repository
git clone https://github.com/tsukumijima/shadowban-eu-frontend.git
cd shadowban-eu-frontend

# Copy .env.example to .env
$ cp .env.example .env

# Dependencies installation
npm install

# Development
npm run dev

# Build (to ./dist/)
npm run build
```

## Notes

### Base href

The `<base href>` is set on build, depending on the `NODE_ENV`:

  - production: https://tools.tsukumijima.net/shadowban-tester/
  - development: http://127.0.0.1:9000/

You can change the base href by editing `SB_EU_BASE_HREF` in the .env file.
 
### API mocks

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
