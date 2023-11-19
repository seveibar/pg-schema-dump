import { DatabaseTree, Schema } from "../types"

const render = (
  objs:
    | Array<{ query: string }>
    | { query: string }
    | {
        [k: string]: { query: string }
      }
) => {
  let queryObjs: Array<{ query: string }>
  if ("query" in objs) return objs.query as string
  if (Array.isArray(objs)) {
    queryObjs = objs
  } else {
    const vals = Object.values(objs)
    if (typeof vals === "string") {
      queryObjs = [objs as any]
    } else {
      queryObjs = vals
    }
  }

  if (queryObjs.length === 0) return ""

  return queryObjs.map((q) => q.query).join(";\n") + ";\n\n"
}

export const getSQLFromTree = (tree: DatabaseTree) => {
  let sql = render(tree.misc)
  sql += Object.values(tree.schemas)
    .filter((s) => s.name !== "public")
    .map((s) => `CREATE SCHEMA ${s.name};`)
    .join("\n")
  for (const schema of Object.values(tree.schemas)) {
    sql += render(schema.functions)
    sql += render(schema.domains)
    sql += render(schema._tablelessSequences)
    for (const table of Object.values(schema.tables)) {
      sql += render(table.sequences)
      sql += render(table)
      sql += render(table.indexes)
      sql += render(table.alterations)
      sql += render(table.policies)
      sql += render(table.grants)
      sql += render(table.rules)
      sql += render(table.triggers)
    }
    sql += render(schema.views)
    sql += render(schema.grants)
  }
  return sql.replace(/\n\n\n/g, "\n\n").replace(/;;/g, ";")
}

export default getSQLFromTree
