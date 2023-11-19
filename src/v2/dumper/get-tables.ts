import * as OutType from "../../types"
import { alphabetical } from "./alphabetical"
import { DumperContext } from "./dumper-context"
import { getIndexesForTable } from "./get-indexes-for-table"
import { getObjFromArray } from "./get-obj-from-array"
import { getPoliciesForTable } from "./get-policies-for-table"
import { getRulesForTable } from "./get-rules-for-table"
import { getSequencesForTable } from "./get-sequences-for-table"
import { getTriggersForTable } from "./get-triggers-for-table"

const getTableDefinition = async (
  {
    tablename,
    schemaname,
    tableowner,
  }: { tablename: string; schemaname: string; tableowner: string },
  ctx: DumperContext
): Promise<OutType.Table> => {
  const { client } = ctx

  const { rows: cols } = await client.query(
    `
    SELECT *
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = $1 AND table_schema = $2;
  `,
    [tablename, schemaname]
  )

  const query = `CREATE TABLE ${schemaname}.${tablename} (
    ${cols
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

  const sn = { schemaname, tablename }

  return {
    query,
    name: tablename,
    schema: schemaname,
    alterations: [],
    columns: cols.map((c) => ({})) as any, // TODO
    grants: [], // TODO
    indexes: getObjFromArray(await getIndexesForTable(sn, ctx)),
    owner: tableowner,
    policies: getObjFromArray(await getPoliciesForTable(sn, ctx)),
    rules: getObjFromArray(await getRulesForTable(sn, ctx)),
    sequences: await getSequencesForTable(sn, ctx),
    triggers: getObjFromArray(await getTriggersForTable(sn, ctx)),
  }
}

export const getTables = async (
  context: DumperContext
): Promise<OutType.Table[]> => {
  const { client, schemas } = context
  const { rows: tableref } = await client.query(`
    SELECT tablename, schemaname, tableowner FROM pg_tables
    WHERE schemaname IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)

  const tables: OutType.Table[] = []
  for (const tr of tableref) {
    const tdef = await getTableDefinition(tr, context)

    tables.push(tdef)
  }

  return tables
}
