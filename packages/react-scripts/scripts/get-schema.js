'use strict';

var fetch = require('node-fetch');
var fs = require('fs');

const {
  buildClientSchema,
  introspectionQuery,
  printSchema,
  extendSchema,
} = require('graphql/utilities');
const { parse } = require('graphql/language');
const chalk = require('chalk');

function isURL(str) {
  var urlRegex =
    '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

let url = process.argv[3] || process.argv[2];

console.log(url);
var argv = require('minimist')(process.argv.slice(2), { boolean: true });

argv._.forEach(command => {
  if (isURL(command)) {
    url = command;
  }
});

if (url === 'get-schema') {
  url = null;
}

if (!url) {
  console.log('Usage: get-schema ' + chalk.green('url'));
  console.log('  ' + chalk.green('url') + ' is your graphql server address');
  process.exit();
}

if (!isURL(url)) {
  console.log(chalk.red(url) + ' is not a valid url');
  process.exit(1);
}

console.log('Downloading for url: ' + chalk.green(url));

fetch(url, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: introspectionQuery }),
})
  .then(res => res.json())
  .then(res => {
    console.log('schemas have downloaded');
    const builtSchema = buildClientSchema(res.data);

    const clientSchemaPath = 'src/clientExtensions.graphql';
    const clientSchemaExists = fs.existsSync(clientSchemaPath);
    if (clientSchemaExists) {
      console.log('client extensions found, mixing in');
      const stringSchemaExtensions = fs.readFileSync(clientSchemaPath, {
        encoding: 'utf8',
      });
      const extendedSchema = extendSchema(
        builtSchema,
        parse(stringSchemaExtensions)
      );
      const extendedSchemaString = printSchema(extendedSchema);
      fs.writeFileSync(
        'src/schemaWithExtensions.graphql',
        extendedSchemaString
      );
    }

    const schemaString = printSchema(builtSchema);
    fs.writeFileSync('src/schema.graphql', schemaString);
    console.log('schemas have been saved');
  })
  .catch(e => {
    console.log(chalk.red('\nError:'));
    console.error(e);
    process.exit(1);
  });
