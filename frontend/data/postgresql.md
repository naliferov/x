PostgreSQL 15 (2022) added the long-awaited standard MERGE operator for upsert logic, a JSON-log format for logs, and improved logical replication (filtering by tables/columns)​ supabase.

Sorting and WAL compression also got faster (with zstd compression support)​, aws, which matters for high-load systems. PostgreSQL 16 (2023) continued the trend: it boosted the performance of parallel queries and made it possible to create statistics for expressions, which improves the planning of complex queries. The Postgres community keeps developing extensions – for example, _pgvector_ for storing embeddings (supporting the aforementioned AI trend) and _pg\_partman_ for convenient time-based data partitioning. Postgres's popularity has led to numerous cloud services built on top of it: _Amazon Aurora PostgreSQL, Google AlloyDB, Neon_ and others, offering scaling, serverless mode, and instant backups. The **Neon** project deserves a special mention – it is a cloud PostgreSQL that separates storage and compute, allowing you to quickly "freeze" and "resume" a database (it uses S3 as storage and compute nodes on demand). Also, in 2023 Amazon introduced **Babelfish for Postgres** – a compatibility layer that lets Postgres understand the T-SQL/MS-SQL protocol, easing migration from Microsoft SQL Server.

## PostgreSQL Indexes

Types: B-tree (default), hash, GiST, SP-GiST, GIN, BRIN. Also: BITMap, covering index. Full-text search: `SELECT * FROM articles WHERE MATCH(title, content) AGAINST('query');`

`EXPLAIN` looks at statistics from `ANALYZE TABLE` , not the actual row count.

## ACID

-   **Atomicity** : an operation either completes fully or does not happen at all
-   **Consistency** : after an operation the database moves into a valid state
-   **Isolation** : parallel operations do not affect each other
-   **Durability** : changes are preserved even in case of system failures

## CRDT (Conflict-free Replicated Data Type)

Data structures for distributed systems with no conflicts during replication. Types: counters, sets, maps, lists with timestamp, trees with ID+timestamp.

## SQL triggers

```sql
-- Types: AFTER/BEFORE INSERT/UPDATE/DELETE
CREATE TRIGGER my_trigger
AFTER INSERT ON my_table
FOR EACH ROW EXECUTE FUNCTION my_function();
```

## SQL queries

```sql
-- UNION, subquery, HAVING, HAVING COUNT
-- Full-text search
SELECT * FROM articles WHERE MATCH(title, content) AGAINST('search query');
```

PGPASSWORD='pass' psql -h localhost -p 5432 -U sandbox -d js-box

\\dt to show the tables

**SQL EXAMPLES**

CREATE TABLE objects (  
id SERIAL PRIMARY KEY,  
data JSONB NOT NULL,  
previous\_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,  
next\_id INTEGER REFERENCES objects(id) ON DELETE SET NULL  
);

CREATE TABLE objects\_operations (  
id SERIAL PRIMARY KEY,  
data JSONB NOT NULL,  
);

CREATE TABLE projects (  
id SERIAL PRIMARY KEY,  
name VARCHAR(255) NOT NULL,  
user\_id INTEGER NOT NULL REFERENCES users(id)  
);

CREATE TABLE project\_object (  
project\_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,  
object\_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,  
PRIMARY KEY (project\_id, object\_id)  
);

CREATE TABLE users (  
id SERIAL PRIMARY KEY,  
name VARCHAR(255) NOT NULL,  
email VARCHAR(25) NOT NULL,  
phash VARCHAR(64) NOT NULL  
);
