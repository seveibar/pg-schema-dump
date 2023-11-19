import { Client } from "pg"

export type DumperContext = {
  client: Client
  schemas: string[]
}
