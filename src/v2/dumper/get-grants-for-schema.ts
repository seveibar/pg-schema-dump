import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getGrantsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.Grant[]> => {}
