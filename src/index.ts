import { Client } from "pg"
import { getConnectionStringFromEnv } from "pg-connection-from-env"
import fs from "fs"
import { getTreeFromSQL, treeToDirectory } from "pgtui"

type DumperContext = {
  client: typeof Client
  schemas: string[]
}

const getTables = async (context: DumperContext) => {
  const { client, schemas } = context
  const { rows } = await client.query(`
    SELECT tablename, schemaname FROM pg_tables
    WHERE schemaname IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)

  return rows.map((row) => `${row.schemaname}.${row.tablename}`)
}

const getTableDefinition = async (
  tableWithSchema: string,
  context: DumperContext
) => {
  const { client } = context
  const [schema, table] = tableWithSchema.split(".")

  const { rows } = await client.query(
    `
    SELECT *
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = $1 AND table_schema = $2;
  `,
    [table, schema]
  )

  return `CREATE TABLE ${schema}.${table} (
    ${rows
      .map((row) => {
        const dataType =
          row.data_type.toUpperCase() === "ARRAY"
            ? `${row.udt_name.replace(/^_/, "")}[]`
            : row.data_type
        return `${row.column_name} ${dataType} ${
          row.is_nullable === "YES" ? "NULL" : "NOT NULL"
        } DEFAULT ${row.column_default || "NULL"}`
      })
      .join(",\n")}
  );\n`
}
const getTableConstraints = async (
  {
    tableWithSchema,
    primaryKeysOnly = false,
    noPrimaryKeys = false,
  }: {
    tableWithSchema: string
    primaryKeysOnly?: boolean
    noPrimaryKeys?: boolean
  },
  context: DumperContext
) => {
  const { client } = context
  const [schema, table] = tableWithSchema.split(".")
  const { rows } = await client.query(
    `
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = n.oid LIMIT 1)
      AND n.nspname = $2;
  `,
    [table, schema]
  )

  return rows
    .filter((row) => {
      if (primaryKeysOnly) {
        return row.pg_get_constraintdef.includes("PRIMARY KEY")
      }
      if (noPrimaryKeys) {
        return !row.pg_get_constraintdef.includes("PRIMARY KEY")
      }
      return true
    })
    .map(
      (row) =>
        `ALTER TABLE ONLY ${schema}."${table}" ADD CONSTRAINT "${row.conname}" ${row.pg_get_constraintdef};\n`
    )
    .join("")
}

const getFunctions = async (context: DumperContext) => {
  const { client, schemas } = context
  let { rows } = await client.query(`
    SELECT pg_get_functiondef(f.oid)
    FROM pg_catalog.pg_proc f
    INNER JOIN pg_catalog.pg_namespace n ON (f.pronamespace = n.oid)
    WHERE n.nspname IN (${schemas.map((s) => `'${s}'`).join(",")})
  `)
  // TODO getting a lot of internal stuff, probably some way to filter for
  // it in the query, manual remove for now
  rows = rows.filter((r) => !r.pg_get_functiondef.includes("$libdir"))

  return rows.map((row) => `${row.pg_get_functiondef};\n`).join("")
}

interface TriggerInfo {
  trigger_catalog: string
  trigger_schema: string
  trigger_name: string
  event_manipulation: string
  event_object_catalog: string
  event_object_schema: string
  event_object_table: string
  action_order: number
  action_condition: string | null
  action_statement: string
  action_orientation: string
  action_timing: string
  action_reference_old_table: string | null
  action_reference_new_table: string | null
  action_reference_old_row: string | null
  action_reference_new_row: string | null
  created: Date
}

function recreateTriggerDefinitions(triggerInfos: TriggerInfo[]): string[] {
  // Group triggers by name
  const groupedTriggers: { [key: string]: TriggerInfo[] } = {}
  triggerInfos.forEach((triggerInfo) => {
    const { trigger_name } = triggerInfo
    if (groupedTriggers[trigger_name]) {
      groupedTriggers[trigger_name].push(triggerInfo)
    } else {
      groupedTriggers[trigger_name] = [triggerInfo]
    }
  })

  // Create trigger definitions from grouped triggers
  const triggerDefinitions: string[] = []
  for (const triggerName in groupedTriggers) {
    const group = groupedTriggers[triggerName]
    const eventManipulations = group
      .map((t) => t.event_manipulation)
      .join(" OR ")

    const triggerDefinition = `CREATE TRIGGER ${triggerName} ${group[0].action_timing} ${eventManipulations} ON ${group[0].event_object_schema}.${group[0].event_object_table} FOR EACH ROW ${group[0].action_statement};`
    triggerDefinitions.push(triggerDefinition)
  }

  return triggerDefinitions
}

const getTriggers = async (context: DumperContext) => {
  const { client, schemas } = context
  const { rows } = await client.query(`
    SELECT *
    FROM information_schema.triggers
    WHERE trigger_schema IN (${schemas.map((s) => `'${s}'`).join(",")})
  `)

  return recreateTriggerDefinitions(rows).join("\n")
}

const getExtensions = async (context: DumperContext) => {
  const { client } = context
  const { rows } = await client.query(`
    SELECT extname FROM pg_extension;
  `)

  return rows
    .map((row) => `CREATE EXTENSION IF NOT EXISTS ${row.extname};\n`)
    .join("")
}

const getIndexes = async (tableWithSchema: string, context: DumperContext) => {
  const { client } = context
  const [schema, table] = tableWithSchema.split(".")
  const { rows } = await client.query(
    `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = $1 AND schemaname = $2;
  `,
    [table, schema]
  )

  const { rows: constraints } = await client.query(
    `
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = n.oid LIMIT 1) 
      AND n.nspname = $2;
  `,
    [table, schema]
  )

  return (
    rows
      // Don't include indexes that are already included as constraints
      .filter(
        (row) =>
          !constraints.some(
            (constraint) => constraint.conname === row.indexname
          )
      )
      .map((row) => `${row.indexdef};\n`)
      .join("")
  )
}
const getGrants = async (context: DumperContext) => {
  const { client, schemas } = context
  const { rows } = await client.query(`
    SELECT grantee, privilege_type, table_name, table_schema
    FROM information_schema.role_table_grants
    WHERE table_schema IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)

  return rows
    .map(
      (row) =>
        `GRANT ${row.privilege_type} ON ${row.table_schema}.${row.table_name} TO ${row.grantee};\n`
    )
    .join("")
}
const getSchemas = async (context: DumperContext) => {
  const { client, schemas } = context

  const res = await client.query(
    `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = ANY($1)`,
    [schemas]
  )

  return res.rows
    .filter((row) => row.schema_name !== "public")
    .map((row) => `CREATE SCHEMA ${row.schema_name};\n`)
    .join("")
}

const createSequences = async (context: DumperContext) => {
  const { client, schemas } = context
  const { rows } = await client.query(`
    SELECT sequence_name, sequence_schema
    FROM information_schema.sequences
    WHERE sequence_schema IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)

  return rows
    .map(
      (row) => `CREATE SEQUENCE ${row.sequence_schema}.${row.sequence_name};\n`
    )
    .join("")
}

export const getSchemaSQL = async ({
  defaultDatabase = "postgres",
  schemas = ["public"],
}: { defaultDatabase?: string; schemas?: string[] } = {}) => {
  const client = new Client({
    connectionString: getConnectionStringFromEnv({
      fallbackDefaults: {
        database: defaultDatabase,
      },
    }),
  })
  await client.connect()

  const dumperContext: DumperContext = {
    client,
    schemas,
  }

  const tables = await getTables(dumperContext)
  let sql = ""

  const schemaSQL = await getSchemas(dumperContext)
  sql += schemaSQL

  const extensions = await getExtensions(dumperContext)
  sql += extensions

  const sequences = await createSequences(dumperContext)
  sql += sequences

  for (const table of tables) {
    const tableDefinition = await getTableDefinition(table, dumperContext)
    sql += tableDefinition
    const tableConstraints = await getTableConstraints(
      { tableWithSchema: table, primaryKeysOnly: true },
      dumperContext
    )
    sql += tableConstraints
    // TODO ALTER TABLE OWNER
  }

  // Unfortunately we have to do these after all the table defs for now to
  // make sure cross-table indexes work
  for (const table of tables) {
    const tableConstraints = await getTableConstraints(
      { tableWithSchema: table, noPrimaryKeys: true },
      dumperContext
    )
    sql += tableConstraints
    const tableIndexes = await getIndexes(table, dumperContext)
    sql += tableIndexes
  }

  const functions = await getFunctions(dumperContext)
  sql += functions

  const triggers = await getTriggers(dumperContext)
  sql += triggers

  const grants = await getGrants(dumperContext)
  sql += grants

  // TODO views

  await client.end()

  return sql
}
