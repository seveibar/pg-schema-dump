import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getViewsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.View[]> => {}
