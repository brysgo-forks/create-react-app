'use strict';
const runAll = require("lint-staged/src/runAll");
const getConfig = require('lint-staged/src/getConfig').getConfig
const validateConfig = require('lint-staged/src/getConfig').validateConfig

runAll({}, validateConfig(getConfig({
    "src/**/*.{js,jsx,json,graphql,css}": [
      "prettier --write",
      "git add"
    ]
  })))
