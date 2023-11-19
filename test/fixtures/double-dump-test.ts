import { getTestPostgresDatabaseFactory } from "ava-postgres"
import { getStructureSQL } from "../../src/v2"

const getTestDatabase = getTestPostgresDatabaseFactory({
  postgresVersion: "15",
})

export const doubleDumpTest = async (
  t: any,
  { sql, schemas = ["public"] }: any
) => {
  const [
    { pool: pool1, connectionString: conn1 },
    { pool: pool2, connectionString: conn2 },
  ] = await Promise.all([getTestDatabase(), getTestDatabase()])

  // await pool1.query(fs.readFileSync("./example1.testing.sql").toString())

  await pool1.query(sql)

  process.env.DATABASE_URL = conn1
  const sql1 = await getStructureSQL({ schemas })

  // fs.writeFileSync("sql1.testing.sql", sql1)

  await pool2.query(sql1)

  const sql2 = await getStructureSQL({ schemas })

  // fs.writeFileSync("sql2.testing.sql", sql2)

  t.is(sql1, sql2)

  return sql1
}
