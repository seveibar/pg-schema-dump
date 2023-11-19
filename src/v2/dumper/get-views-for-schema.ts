import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getViewsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.View[]> => {
  // Query to fetch view details
  let { rows } = await ctx.client.query(
    `
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = $1;
  `,
    [schemaname]
  )

  // Build a map of view name to its dependencies
  const viewDependencies: Map<string, string[]> = new Map()
  rows.forEach((row) => {
    const viewName = `${schemaname}.${row.table_name}`
    const definition = row.view_definition
    const dependencies: string[] = []

    // Extract dependencies from the view definition
    rows.forEach((depRow) => {
      const depViewName = `${schemaname}.${depRow.table_name}`
      if (definition.includes(depViewName) && viewName !== depViewName) {
        dependencies.push(depViewName)
      }
    })

    viewDependencies.set(viewName, dependencies)
  })

  // Sort the views based on their dependencies
  const sortedViews: string[] = []
  const visited = new Set()

  const visit = (viewName: string) => {
    if (!visited.has(viewName)) {
      visited.add(viewName)

      const dependencies = viewDependencies.get(viewName)
      dependencies?.forEach(visit)

      sortedViews.push(viewName)
    }
  }

  ;[...viewDependencies.keys()].forEach(visit)

  // Map the sorted view names back to OutType.View format
  const viewObjects: OutType.View[] = []
  for (const viewName of sortedViews) {
    const row = rows.find((r) => `${schemaname}.${r.table_name}` === viewName)
    if (!row) throw new Error(`View ${viewName} not found`)

    viewObjects.push({
      name: row.table_name,
      query: `CREATE VIEW ${viewName} AS ${row.view_definition}`,
      columns: [], // TODO Additional queries for column details
      grants: [], // TODO Additional queries for grants
      triggers: {}, // TODO Additional queries for triggers
      alterations: [], // TODO Additional queries for alterations
      owner: "", // TODO Additional queries for owner
    })
  }

  return viewObjects
}
