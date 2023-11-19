import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getPoliciesForTable = async (
  { schemename, tablename }: { schemename: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Policy> => {}
