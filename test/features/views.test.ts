import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] views dependency sorting", async (t) => {
  const structure: string = await doubleDumpTest(t, {
    sql: `
      CREATE TABLE test_table(
        id uuid PRIMARY KEY,
        name text not null UNIQUE
      );

      CREATE VIEW first_level_view AS
      SELECT id
      FROM test_table;

      CREATE VIEW second_level_view AS
      SELECT id
      FROM first_level_view;

      CREATE VIEW third_level_view AS
      SELECT id
      FROM second_level_view;
    `,
  })

  t.log(structure)

  // Assuming doubleDumpTest returns a string where views are listed in the order of creation
  const firstLevelViewIndex = structure.indexOf(
    "CREATE VIEW public.first_level_view"
  )
  const secondLevelViewIndex = structure.indexOf(
    "CREATE VIEW public.second_level_view"
  )
  const thirdLevelViewIndex = structure.indexOf(
    "CREATE VIEW public.third_level_view"
  )

  // Check if the views are sorted correctly in the structure
  t.true(
    firstLevelViewIndex < secondLevelViewIndex &&
      secondLevelViewIndex < thirdLevelViewIndex
  )
})
