"use strict";
const spawn = require("brysgo-react-dev-utils/crossSpawn");
var fetch = require("node-fetch");
var fs = require("fs");

const {
  buildClientSchema,
  buildASTSchema,
  introspectionQuery,
  printSchema,
  extendSchema
} = require("graphql/utilities");
const { parse } = require("graphql/language");
const chalk = require("chalk");
const program = require("commander");

process.on("uncaughtException", function(error) {
  console.log(chalk.red(error.message));
  console.log(error.stack);
});

function isURL(str) {
  var urlRegex =
    "^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$";
  var url = new RegExp(urlRegex, "i");
  return str.length < 2083 && url.test(str);
}

program
  .version("1")
  .description("utility for managing relay modern")
  .option(
    "-u, --update [url]",
    "Download and update the schema from the graphql endpoint url"
  )
  .parse(process.argv);

if (program.update) {
  const url = program.update;
  if (!isURL(url)) {
    console.log(chalk.red(url) + " is not a valid url");
    process.exit(1);
  }
  console.log("Downloading for url: " + chalk.green(url));

  fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: introspectionQuery })
  })
    .then(res => res.json())
    .then(res => {
      console.log("schema has been downloaded");
      const builtSchema = buildClientSchema(res.data);

      remoteSchemaBuilt(builtSchema);
    })
    .catch(e => {
      console.log(chalk.red("\nError:"));
      console.error(e);
      process.exit(1);
    });
} else {
  if (fs.existsSync("src/schema.graphql")) {
    console.log(chalk.red("\nError: schema.graphql location error"));
    console.error(
      "As of Relay 1.5.0, schema.graphql can no longer be in src/ directory, please move 'src/schema.graphql' to 'schema.graphql'"
    );
    process.exit(1);
  }
  if (fs.existsSync("src/schemaWithExtensions.graphql")) {
    console.log(chalk.red("\nError: schemaWithExtensions.graphql location error"));
    console.error(
      "As of Relay 1.5.0, client schema extensions work differently you should delete schemaWithExtensions.graphql"
    );
    process.exit(1);
  }
  const savedSchemaString = fs.readFileSync("schema.graphql", "utf8");
  const builtSchema = buildASTSchema(parse(savedSchemaString));
  remoteSchemaBuilt(builtSchema);
}

function remoteSchemaBuilt(builtSchema) {
  const schemaString = printSchema(builtSchema);
  fs.writeFileSync("schema.graphql", schemaString);
  console.log("schema has been saved");

  console.log("running relay-compiler...");
  spawn.sync(
    "relay-compiler",
    [
      "--src",
      "./src",
      "--schema",
      "schema.graphql"
    ],
    { stdio: "inherit" }
  );
}
