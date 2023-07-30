# Node PG Schema Dump

This is an alternative to `pg_dump` written in node. You can use this to get
all the SQL to recreate a schema.

## Installation

`npm add -D pg-dump`

## Usage

### `schema.sql` dumping

```bash
# By default, pg-dump knows POSTGRES_HOST, DATABASE_URL, etc.
pg-dump dump

# Dump schema.sql to stdout for public schema on default database "postgres"
pg-dump dump -h localhost -U postgres

# With postgres URL
pg-dump dump psql://user:1234@localhost:5432/my_db
```

### Tree Dumping

"Tree Dumps" are great for code reviews. They use a directory structure to
easily diff database changes. For example, a table definition goes into a file
in `<schema>/<table>/table.sql`. This makes it easy to find and examine different
parts of your database in a structured way.

```bash
pg-dump dump-tree /path/to/dir

# You can use the same environment variables or specify the host etc.
pg-dump dump-tree -h localhost -U postgres /path/to/dir
```

### As a Library

```ts
import { getSchemaSQL, getTree } from "pg-schema-dump"

// Uses environment variables, DATABASE_URL etc.
await getSchemaSQL({
  schemas: ["public"],
})

await getTree({
  schemas: ["public"],
})
```
