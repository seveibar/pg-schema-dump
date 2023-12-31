import isEmpty from "lodash/isEmpty"
import { DatabaseTree } from "../types"
import { writeVfsToDirectory } from "make-vfs"
import { format as formatSQL } from "sql-formatter"

const section = (title, content) => {
  if (!content) return ""
  return `--\n-- ${title}\n--\n\n${content}\n`
}

const render = (queries: Array<{ query: string }> | { query: string }) => {
  if (!queries || isEmpty(queries)) return ""
  const queriesList = Array.isArray(queries) ? queries : [queries]
  return queriesList.map(({ query }) => query + ";").join("\n\n")
}

export const getVfsFromTree = (
  db: DatabaseTree
): { [filePath: string]: string } => {
  const d = {}
  d["misc.sql"] =
    section("Extensions", render(db.extensions)) +
    section("Misc", render(db.misc))

  for (const schema of Object.values(db.schemas)) {
    for (const table of Object.values(schema.tables)) {
      d[`${schema.name}/tables/${table.name}/table.sql`] =
        render(table) +
        "\n" +
        render(table.alterations) +
        "\n" +
        render(Object.values(table.indexes))
      if (!isEmpty(table.triggers)) {
        d[`${schema.name}/tables/${table.name}/triggers.sql`] = render(
          Object.values(table.triggers)
        )
      }
      if (!isEmpty(table.sequences)) {
        d[`${schema.name}/tables/${table.name}/sequences.sql`] =
          render(table.sequences) +
          render(table.sequences.flatMap((s) => s.grants))
      }
      if (!isEmpty(table.policies)) {
        d[`${schema.name}/tables/${table.name}/policies.sql`] = render(
          Object.values(table.policies)
        )
      }
    }
    for (const view of Object.values(schema.views)) {
      d[`${schema.name}/views/${view.name}.sql`] =
        render(view) +
        "\n" +
        render(view.alterations) +
        "\n" +
        section("Grants", render(view.grants)) +
        section("Triggers", render(Object.values(view.triggers)))
      view.triggers
    }
    for (const fn of Object.values(schema.functions)) {
      d[`${schema.name}/functions/${fn.name}.sql`] = render(fn)
    }
    if (!isEmpty(schema.grants)) {
      d[`${schema.name}/grants.sql`] = render(schema.grants)
    }
  }

  // Format each SQL file
  for (const filePath in d) {
    try {
      d[filePath] = formatSQL(d[filePath], { language: "postgresql" })
    } catch (e) {
      console.log(`Error formatting ${filePath}\n\n${d[filePath]}`)
      continue
    }
  }

  return d
}
