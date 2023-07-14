# dvm2web

[![License](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

Bridge a DVM network with a fancy web interface.

## Getting started

The target server is dvmbridge (see <https://github.com/DVMProject/dvmbridge>).

### Running dvm2web

Make sure you have [node installed](https://nodejs.org/)

```bash
cd dvm2web/src/server
node index.js --config config.yml
```

### Configure

Edit the `config.example.yml` file to your needs

### Usage

http://localhost:3000 will be the default location of the app

TX DOES NOT WORK AT THIS TIME

## Todo

* Add a way to assign an ID to the user on the browser
* Add TX support