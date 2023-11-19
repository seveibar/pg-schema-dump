import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getRulesForTable = async (
  { schemename, tablename }: { schemename: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Rule> => {}
