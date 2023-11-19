import { Client } from "pg"
import { getConnectionStringFromEnv } from "pg-connection-from-env"
import * as OutType from "../types"
import { DumperContext, alphabetical, getTables } from "./dumper"
import { getObjFromArray } from "./dumper/get-obj-from-array"
import { getDomainsForSchema } from "./dumper/get-domains-for-schema"
import { getFunctionsForSchema } from "./dumper/get-functions-for-schema"
import { getViewsForSchema } from "./dumper/get-views-for-schema"
import { uniq } from "lodash"
import { getGrantsForSchema } from "./dumper/get-grants-for-schema"
import { getTablelessSequencesForSchema } from "./dumper/get-tableless-sequences-for-schema"
import { getAllSchemaNames } from "./dumper/get-all-schema-names"

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
      .sort(alphabetical)
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
    .sort(alphabetical)
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

  return rows
    .map((row) => `${row.pg_get_functiondef};\n`)
    .sort(alphabetical)
    .join("")
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

  return recreateTriggerDefinitions(rows).sort(alphabetical).join("\n")
}

const getExtensions = async (context: DumperContext) => {
  const { client } = context
  const { rows } = await client.query(`
    SELECT extname FROM pg_extension;
  `)

  return rows
    .map((row) => `CREATE EXTENSION IF NOT EXISTS ${row.extname};\n`)
    .sort(alphabetical)
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
      .sort(alphabetical)
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
    .sort(alphabetical)
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
    .sort(alphabetical)
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
    .sort(alphabetical)
    .join("")
}

const createViews = async (context: DumperContext) => {
  const { client, schemas } = context
  let { rows } = await client.query(`
    SELECT table_name, view_definition, table_schema
    FROM information_schema.views
    WHERE table_schema IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)
  rows = rows.sort((a, b) =>
    alphabetical(a.table_schema + a.table_name, b.table_schema + b.table_name)
  )

  // Build a map of view name to its dependencies
  const viewDependencies: Map<string, string[]> = new Map()
  rows.forEach((row) => {
    const viewName = `${row.table_schema}.${row.table_name}`
    const definition = row.view_definition
    const dependencies: string[] = []

    // Extract dependencies from the view definition
    rows.forEach((depRow) => {
      const depViewName = `${depRow.table_schema}.${depRow.table_name}`
      if (definition.includes(depViewName)) {
        dependencies.push(depViewName)
      }
    })

    viewDependencies.set(viewName, dependencies)
  })

  // Sort the views based on their dependencies
  const sortedViews: string[] = []
  const visited = new Set()

  const visit = (viewName) => {
    if (!visited.has(viewName)) {
      visited.add(viewName)

      const dependencies = viewDependencies.get(viewName)
      if (!dependencies) throw new Error("invalid dep- graph issue")
      dependencies.forEach(visit)

      sortedViews.push(viewName)
    }
  }

  ;[...viewDependencies.keys()].forEach(visit)

  // Map the sorted view names back to CREATE VIEW statements
  const viewStatements = sortedViews.map((viewName) => {
    const row = rows.find(
      (r) => `${r.table_schema}.${r.table_name}` === viewName
    )
    return `CREATE VIEW ${row.table_schema}.${row.table_name} AS ${row.view_definition}\n`
  })

  return viewStatements.join("")
}
export const getDatabaseTreeUsingClient = async ({
  defaultDatabase = "postgres",
  schemas = ["public"],
}: {
  defaultDatabase?: string
  schemas?: string[]
} = {}): Promise<OutType.DatabaseTree> => {
  const client = new Client({
    connectionString: getConnectionStringFromEnv({
      fallbackDefaults: {
        database: defaultDatabase,
      },
    }),
  })
  await client.connect()

  const ctx: DumperContext = {
    client,
    schemas,
  }

  const dt: OutType.DatabaseTree = {
    extensions: [],
    misc: [],
    schemas: {},
  }

  const tables = await getTables(ctx)

  // Initiatialize Schemas
  for (const schema of schemas) {
    const sn = { schemaname: schema }
    // TODO get schema owner
    dt.schemas[schema] = {
      name: schema,
      tables: getObjFromArray(tables.filter((t) => t.schema === schema)),
      views: getObjFromArray(await getViewsForSchema(sn, ctx)),
      functions: getObjFromArray(await getFunctionsForSchema(sn, ctx)),
      domains: getObjFromArray(await getDomainsForSchema(sn, ctx)),
      grants: await getGrantsForSchema(sn, ctx),
      owner: "",
      _tablelessSequences: getObjFromArray(
        await getTablelessSequencesForSchema(sn, ctx)
      ),
    }
  }


  // const schemaSQL = await getSchemas(dumperContext)
  // sql += schemaSQL

  // const extensions = await getExtensions(dumperContext)
  // sql += extensions

  // const sequences = await createSequences(dumperContext)
  // sql += sequences

  // for (const table of tables) {
  //   const tableDefinition = await getTableDefinition(table, dumperContext)
  //   sql += tableDefinition
  //   const tableConstraints = await getTableConstraints(
  //     { tableWithSchema: table, primaryKeysOnly: true },
  //     dumperContext
  //   )
  //   sql += tableConstraints
  //   // TODO ALTER TABLE OWNER
  // }

  // // Unfortunately we have to do these after all the table defs for now to
  // // make sure cross-table indexes work
  // for (const table of tables) {
  //   const tableConstraints = await getTableConstraints(
  //     { tableWithSchema: table, noPrimaryKeys: true },
  //     dumperContext
  //   )
  //   sql += tableConstraints
  //   const tableIndexes = await getIndexes(table, dumperContext)
  //   sql += tableIndexes
  // }

  // const views = await createViews(dumperContext)
  // sql += views

  // const functions = await getFunctions(dumperContext)
  // sql += functions

  // const triggers = await getTriggers(dumperContext)
  // sql += triggers

  // const grants = await getGrants(dumperContext)
  // sql += grants

  await client.end()

  return dt
}
