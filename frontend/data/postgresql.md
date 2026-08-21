# postgresql

CRDT живёт отдельно: [crdt](/doc/crdt).

## PostgreSQL Indexes

Types: B-tree (default), hash, GiST, SP-GiST, GIN, BRIN. Also: BITMap, covering index. Full-text search: `SELECT * FROM articles WHERE to_tsvector('simple', title || ' ' || content) @@ plainto_tsquery('query');` (GIN-индекс по `to_tsvector`)

`EXPLAIN` looks at statistics from `ANALYZE TABLE` , not the actual row count.

## ACID

-   **Atomicity** : an operation either completes fully or does not happen at all
-   **Consistency** : after an operation the database moves into a valid state
-   **Isolation** : parallel operations do not affect each other
-   **Durability** : changes are preserved even in case of system failures

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
