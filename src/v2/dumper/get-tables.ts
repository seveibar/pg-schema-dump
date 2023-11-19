export const getTables = async (
  context: DumperContext
): Promise<OutType.Table[]> => {
  const { client, schemas } = context
  const { rows } = await client.query(`
    SELECT tablename, schemaname, tableowner FROM pg_tables
    WHERE schemaname IN (${schemas.map((s) => `'${s}'`).join(",")});
  `)

  const tables: OutType.Table[] = []
  for (const row of rows) {
    tables.push({
      name: row.tablename,
      schema: row.schemaname,
      alterations: [],
      columns: [],
      grants: [],
      indexes: {},
      owner: row.tableowner,
      policies: {},
      query: "",
      rules: {},
      sequences: [],
      triggers: {},
    })
  }

  return tables
}
