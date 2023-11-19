import test from "ava"
import fs from "fs"
import { getTestPostgresDatabaseFactory } from "ava-postgres"
import { getSchemaSQL } from "../../src/v1"
import {
  makeIntrospectionQuery,
  parseIntrospectionResults,
} from "pg-introspection"
import { DatabaseTree } from "../../src/types"

const getTestDatabase = getTestPostgresDatabaseFactory({
  postgresVersion: "14",
})

test("dump an example sql schema, should be the same when re-uploading and re-dumping", async (t) => {
  const [{ pool: pool1, connectionString: conn1 }] = await Promise.all([
    getTestDatabase(),
  ])

  // await pool1.query(fs.readFileSync("./example1.testing.sql").toString())

  await pool1.query(`
  CREATE TABLE test_table(
    id uuid PRIMARY KEY,
    name text not null
  )
  `)

  const { rows } = await pool1.query(makeIntrospectionQuery())
  const introspection = parseIntrospectionResults(rows[0])

  const dt: DatabaseTree = {
    schemas: {},
    misc: [],
    extensions: [],
  }

  for (const pgClass of introspection.classes) {
    const schemaName = pgClass.getNamespace()?.nspname
    if (schemaName) {
      if (!dt.schemas[schemaName]) {
        dt.schemas[schemaName] = {
          name: schemaName,
          tables: {},
          views: {},
          functions: {},
          domains: {},
          grants: [],
          owner: pgClass.getOwner()?.rolname ?? "",
          _tablelessSequences: {},
        }
      }
    }

    if (pgClass.relname) {
      const table = {
        name: pgClass.relname, // Assuming 'relname' is the name of the class
        columns: [], // Populate columns
        query: "", // Construct query for the table
        policies: {},
        triggers: {},
        rules: {},
        indexes: {},
        alterations: [],
        sequences: [],
        grants: [],
        owner: pgClass.getOwner()?.rolname ?? "", // Assuming getOwner returns the owner
      }
      dt.schemas[schemaName].tables[table.name] = table
    }
  }

  console.log(dt)
})
