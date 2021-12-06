# Twitter Shadowban Test (Frontend)

**One-page web app, testing Twitter users for various shadowbans.**

Frontend (this repository):   
[tsukumijima/shadowban-eu-frontend](https://github.com/tsukumijima/shadowban-eu-frontend)

Backend:   
[tsukumijima/shadowban-eu-backend](https://github.com/tsukumijima/shadowban-eu-backend)

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

  - production: https://tools.tsukumijima.net/shadowban-tests/
  - development: http://127.0.0.1:9000/

You can change the base href by editing `BASE_HREF` in the .env file.
 
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
