#!/usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { dumpSQL } from "./dump-sql"

yargs(hideBin(process.argv))
  .command(
    "dump",
    "Dumps a PostgreSQL database to a SQL file",
    (yargs) => {
      return yargs
        .option("host", {
          alias: "H",
          type: "string",
          description: "Host of the PostgreSQL server",
          default: "localhost",
        })
        .option("port", {
          alias: "p",
          type: "number",
          description: "Port of the PostgreSQL server",
          default: 5432,
        })
        .option("user", {
          alias: "U",
          type: "string",
          description: "Username for the PostgreSQL server",
          default: "postgres",
        })
        .option("password", {
          alias: "W",
          type: "string",
          description: "Password for the PostgreSQL server",
        })
        .option("database", {
          alias: "d",
          type: "string",
          description: "Database to dump",
        })
        .option("schemas", {
          alias: "s",
          type: "string",
          description: "Schemas to dump, comma-separated",
        })
    },
    (argv) => {
      if (argv.host) process.env.POSTGRES_HOST = argv.host
      if (argv.port) process.env.POSTGRES_PORT = argv.port.toString()
      if (argv.user) process.env.POSTGRES_USER = argv.user
      if (argv.password) process.env.POSTGRES_PASSWORD = argv.password
      if (argv.database) process.env.POSTGRES_DATABASE = argv.database

      dumpSQL()
    }
  )
  .help()
  .alias("help", "h")
  .parse()
