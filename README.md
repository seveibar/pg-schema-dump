# Node PG Dump

This is an alternative to `pg_dump` written in node.

> NOTE: Currently only dumps schema and not the data.

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
