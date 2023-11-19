import test from "ava"
import { getSQLFromTree } from "../src/v2"

test("get sql from tree", async (t) => {
  const sql = getSQLFromTree({
    extensions: [],
    misc: [],
    schemas: {
      public: {
        tables: {
          test_table: {
            query: `CREATE TABLE test_table (id uuid PRIMARY KEY, name text NOT NULL)`,
            name: "test_table",
            schema: "public",
            alterations: [],
            columns: [
              {
                name: "id",
                type: "PRIMARY KEY",
                query: "",
                comments: [],
              },
              {
                name: "name",
                type: "text",
                query: "",
                comments: [],
              },
            ],
            grants: [],
            indexes: {},
            owner: "postgres",
            policies: {},
            rules: {},
            sequences: [],
            triggers: {},
          },
        },
        name: "",
        views: {},
        functions: {},
        domains: {},
        grants: [],
        owner: "",
        _tablelessSequences: {},
      },
    },
  })
  // TODO there should also be a create schema and a proper schema prefix here
  t.truthy(
    sql.includes(
      "CREATE TABLE test_table (id uuid PRIMARY KEY, name text NOT NULL)"
    )
  )
})
