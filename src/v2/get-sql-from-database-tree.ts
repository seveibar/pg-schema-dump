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
  return queryObjs.map((q) => q.query).join("\n")
}

export const getSQLFromTree = (tree: DatabaseTree) => {
  let sql = render(tree.misc)
  for (const schema of Object.values(tree.schemas)) {
    sql += render(schema.functions)
    sql += render(schema.domains)
    sql += render(schema._tablelessSequences)
    for (const table of Object.values(schema.tables)) {
      sql += render(table.sequences)
      sql += render(table)
      sql += render(table.alterations)
      sql += render(table.triggers)
    }
    sql += render(schema.views)
    sql += render(schema.grants)
  }
  return sql
}

export default getSQLFromTree
