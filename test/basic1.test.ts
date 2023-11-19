import test from "ava"
import { doubleDumpTest } from "./fixtures/double-dump-test"

test("[double-dump-test] basic1", async (t) => {
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null
    )
    `,
  })
  t.log(structure)
})
