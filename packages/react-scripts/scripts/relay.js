'use strict';
const spawn = require('brysgo-react-dev-utils/crossSpawn');
var fetch = require('node-fetch');
var fs = require('fs');

const {
  buildClientSchema,
  buildASTSchema,
  introspectionQuery,
  printSchema,
  extendSchema,
} = require('graphql/utilities');
const { parse } = require('graphql/language');
const chalk = require('chalk');
const program = require('commander');

process.on('uncaughtException', function(error) {
  console.log(chalk.red(error.message));
  console.log(error.stack);
});

function isURL(str) {
  var urlRegex =
    '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

program
  .version('1')
  .description('utility for managing relay modern')
  .option(
    '-u, --update [url]',
    'Download and update the schema from the graphql endpoint url'
  )
  .parse(process.argv);

if (program.update) {
  const url = program.update;
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
      console.log('schema has been downloaded');
      const builtSchema = buildClientSchema(res.data);

      remoteSchemaBuilt(builtSchema);
    })
    .catch(e => {
      console.log(chalk.red('\nError:'));
      console.error(e);
      process.exit(1);
    });
} else {
  const savedSchemaString = fs.readFileSync('src/schema.graphql', 'utf8');
  const builtSchema = buildASTSchema(parse(savedSchemaString));
  remoteSchemaBuilt(builtSchema);
}

function remoteSchemaBuilt(builtSchema) {
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
    fs.writeFileSync('src/schemaWithExtensions.graphql', extendedSchemaString);
  }

  const schemaString = printSchema(builtSchema);
  fs.writeFileSync('src/schema.graphql', schemaString);
  console.log('schemas have been saved');

  console.log('running relay-compiler...');
  spawn.sync(
    'relay-compiler',
    [
      '--src',
      './src',
      '--schema',
      clientSchemaExists
        ? 'src/schemaWithExtensions.graphql'
        : 'src/schema.graphql',
    ],
    { stdio: 'inherit' }
  );
}
