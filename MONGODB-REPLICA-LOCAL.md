# Local MongoDB replica set (1 primary + 2 secondaries)

This guide sets up a **3-node replica set** for local development:

| Role      | Host port (from your machine) | Internal Docker hostname |
|-----------|-------------------------------|---------------------------|
| Primary   | `27017`                       | `mongo-rs0-1`             |
| Secondary | `27018`                       | `mongo-rs0-2`             |
| Secondary | `27019`                       | `mongo-rs0-3`             |

> **Note:** The existing [`docker-compose.yml`](./docker-compose.yml) in this folder is **PostgreSQL only**. Use the MongoDB compose file below (add it as a separate file, e.g. `docker-compose.mongodb.yml`), or run the Kubernetes option.

---

## 1. Docker Compose (recommended for laptops)

Create **`docker-compose.mongodb.yml`** next to this doc (content below), then:

```bash
cd /path/to/ourlane/ride-replica-setup
docker compose -f docker-compose.mongodb.yml up -d
```

Wait until all three containers are healthy, then **initialize the replica set** once:

```bash
docker exec -it mongo-rs0-1 mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-rs0-1:27017", priority: 1 },
    { _id: 1, host: "mongo-rs0-2:27017", priority: 0.5 },
    { _id: 2, host: "mongo-rs0-3:27017", priority: 0.5 }
  ]
});
'
```

Check status:

```bash
docker exec -it mongo-rs0-1 mongosh --eval 'rs.status()'
```

### Create application user (example)

Adjust user, password, and database to match `moniic-car-rental-booking` `.env`:

```bash
docker exec -it mongo-rs0-1 mongosh admin --eval '
db.createUser({
  user: "ourlane",
  pwd: "mysecretpassword",
  roles: [
    { role: "readWrite", db: "voice_session_db" },
    { role: "readWrite", db: "admin" }
  ]
});
'
```

If you prefer auth against `admin` only, use `authSource=admin` in the URI and grant `readWrite` on `voice_session_db`.

### Example `docker-compose.mongodb.yml`

```yaml
services:
  mongo-rs0-1:
    image: mongo:7
    container_name: mongo-rs0-1
    hostname: mongo-rs0-1
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27017:27017"
    volumes:
      - mongo_rs0_1:/data/db
    networks:
      - mongo-rs

  mongo-rs0-2:
    image: mongo:7
    container_name: mongo-rs0-2
    hostname: mongo-rs0-2
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27018:27017"
    volumes:
      - mongo_rs0_2:/data/db
    networks:
      - mongo-rs

  mongo-rs0-3:
    image: mongo:7
    container_name: mongo-rs0-3
    hostname: mongo-rs0-3
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27019:27017"
    volumes:
      - mongo_rs0_3:/data/db
    networks:
      - mongo-rs

volumes:
  mongo_rs0_1:
  mongo_rs0_2:
  mongo_rs0_3:

networks:
  mongo-rs:
    driver: bridge
```

---

## 2. Kubernetes (cluster-style local dev)

Typical pattern:

1. **Namespace** (optional) for isolation.
2. **StatefulSet** with 3 replicas, each with its own **PersistentVolumeClaim**.
3. **Headless Service** so pods get stable DNS: `mongo-rs0-0.mongo`, `mongo-rs0-1.mongo`, etc.
4. **Init job or manual `rs.initiate()`** once the pods are ready, using the **internal** hostnames from the StatefulSet (not `localhost`).

Ports are usually **27017** inside the cluster; you expose one member via **NodePort** or **Ingress** only if something outside the cluster must connect. For `kubectl port-forward`, you often forward to the primary pod only.

Exact manifests depend on your cluster (kind, minikube, EKS, etc.). Keep the same replica set name **`rs0`** and three members so connection strings stay consistent.

---

## 3. Using this with `moniic-car-rental-booking` `.env`

Your service reads `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `DATABASE_NAME` and builds a **single-host** Mongoose URI in [`database.config.ts`](../moniic-car-rental-booking/src/shared/processors/database/database.config.ts).

### Option A — Talk to the primary only (simplest, no code change)

Point the app at the primary port:

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=27017
DATABASE_USERNAME=ourlane
DATABASE_PASSWORD=mysecretpassword
DATABASE_NAME=voice_session_db
```

This works for local development: the driver connects to the primary. The two secondaries still run and you can verify replication with `rs.printSecondaryReplicationInfo()` in `mongosh`.

If you hit topology or `directConnection` behavior differences, try `127.0.0.1` instead of `localhost`, and align `authSource` with where you created the user (`admin` vs database name).

### Option B — Full replica-set connection string (all three hosts)

The stock config does **not** pass multiple hosts or `replicaSet=`. To use a URI like:

```text
mongodb://ourlane:mysecretpassword@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&authSource=admin
```

you would add something like `DATABASE_URI` (or extend the config builder) in **`database.config.ts`** and set that from `.env`. That is the right approach when you want the driver to discover primaries and fail over during tests.

### Replica set hostnames vs `localhost`

MongoDB members advertise the hostnames stored at `rs.initiate()`. If those are Docker names (`mongo-rs0-1`, …), a client on your **host** may get confused after server discovery. For **host-only** apps connecting to published ports, **Option A** (primary + port **27017**) avoids most issues. For **Option B**, you may need hosts file entries mapping `mongo-rs0-{1,2,3}` to `127.0.0.1`, or run the app inside the same Docker network as the compose stack.

---

## 4. Quick checklist

- [ ] Three nodes listening on **27017 / 27018 / 27019** (host) or internal K8s DNS.
- [ ] `rs.initiate()` run once with **matching** member hostnames.
- [ ] App user created and `.env` credentials match.
- [ ] Choose Option A (primary only) or Option B (full URI + small code change).
- [ ] Remove or avoid conflicting MongoDB processes on those ports.

---

## 5. Tear down (Docker)

```bash
docker compose -f docker-compose.mongodb.yml down -v
```

`-v` removes volumes and **wipes data**.

---

## 6. Connect from NestJS and NoSQLBooster

Your replica set is **`rs0`** with members `mongo-rs0-1:27017`, `mongo-rs0-2:27017`, and `mongo-rs0-3:27017` (Docker hostnames). From your **Mac**, the compose file maps them to **127.0.0.1:27017**, **127.0.0.1:27018**, and **127.0.0.1:27019**.

Use the **same user and database** you created with `db.createUser` (examples earlier in this doc use `ourlane` / `mysecretpassword` / `voice_session_db`). Adjust to match your setup.

### Hostname discovery from the host machine

After the driver connects, it may learn member addresses as `mongo-rs0-*`. If connections fail or switch to wrong hosts, add these lines to **`/etc/hosts`** (macOS/Linux):

```text
127.0.0.1 mongo-rs0-1 mongo-rs0-2 mongo-rs0-3
```

Alternatively, run the NestJS app **inside the same Docker network** as the MongoDB compose stack and use internal hostnames and port **27017** for each service name.

### NoSQLBooster

1. Open **NoSQLBooster** → **Connect** → **From URI** (or **New Connection** and paste URI in the connection string field).
2. Use a **multi-host** URI with `replicaSet=rs0` and the correct `authSource` (often `admin` if the user was created on `admin`):

```text
mongodb://ourlane:mysecretpassword@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&authSource=admin
```

3. If you use a database user defined **only** on `voice_session_db`, set `authSource=voice_session_db` instead.
4. Test **Connect**. You should see **Primary** / **Secondary** in the topology or be able to run `rs.status()` in a shell tab.

Optional: append `&readPreference=secondaryPreferred` to the URI if you want **reads** to prefer secondaries (writes still go to the primary).

### NestJS (Mongoose)

Point your app at the same style of URI. The **moniic-car-rental-booking** project builds a single-host URI from `DATABASE_HOST` / `DATABASE_PORT` in [`database.config.ts`](../moniic-car-rental-booking/src/shared/processors/database/database.config.ts). For a **full replica set** connection string, either:

- Add an env var such as **`DATABASE_URI`** and set it to the full URI above (and teach `DatabaseConfig` to prefer `DATABASE_URI` when set), **or**
- Build the string in `DatabaseConfig` from multiple hosts or a comma-separated list in `.env`.

Example `.env` value (single line):

```env
DATABASE_URI=mongodb://ourlane:mysecretpassword@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&authSource=admin
```

In `MongooseModule.forRootAsync` / `MongooseModuleOptions`, return `{ uri: process.env.DATABASE_URI, ... }` and **do not** set `directConnection=true` on this URI (that pins a single node and defeats replica set failover).

Optional read preference for reads:

```ts
{ uri: databaseUri, readPreference: 'secondaryPreferred' }
```

For **split** read/write connections, register a second `MongooseModule.forRootAsync` with a `connectionName` (e.g. `'read'`) and `readPreference: 'secondaryPreferred'` on that connection only.

---

## 7. Queries from this replica set (`mongosh`)

Run these **inside Docker** so hostnames `mongo-rs0-*` resolve on the bridge network. Replace database/collection/user/password with yours.

### Open a shell on the primary (interactive)

```bash
cd /path/to/ride-replica-setup
docker exec -it mongo-rs0-1 mongosh
```

With authentication (example user on `admin`):

```bash
docker exec -it mongo-rs0-1 mongosh -u ourlane -p mysecretpassword --authenticationDatabase admin
```

### List databases (one-liner)

```bash
docker exec -it mongo-rs0-1 mongosh --quiet --eval "db.adminCommand('listDatabases')"
```

### List collections in a database (one-liner)

Replace `voice_session_db` with your DB name:

```bash
docker exec -it mongo-rs0-1 mongosh voice_session_db --quiet --eval "db.getCollectionNames()"
```

### Switch database and inspect (interactive `mongosh`)

```javascript
show dbs
use voice_session_db
show collections
db.stats()
```

### Find documents (default read on the node you are connected to)

```javascript
use voice_session_db
db.my_collection.find().limit(5)
db.my_collection.find({ status: "ACTIVE" }).limit(10)
db.my_collection.countDocuments({})
```

### Find with `secondaryPreferred` (mongosh)

Reads prefer a **secondary** when available; otherwise the **primary**. Set read preference, then query:

```javascript
db.getMongo().setReadPref('secondaryPreferred')
use voice_session_db
db.my_collection.find().limit(5)
```

Alternative: attach read preference to a single cursor (MongoDB shell / `mongosh`):

```javascript
use voice_session_db
db.my_collection.find().readPref('secondaryPreferred').limit(5)
```

### One-liner: `find` with `secondaryPreferred`

```bash
docker exec -it mongo-rs0-1 mongosh voice_session_db --quiet --eval \
  'db.my_collection.find().readPref("secondaryPreferred").limit(3).toArray()'
```

Replace `my_collection` with a real collection name.

### Confirm which member you are reading from

```javascript
db.hello()
// "isWritablePrimary" / "secondary" in the response shows the node role for this connection
```

### Optional: attach to a secondary container

```bash
docker exec -it mongo-rs0-2 mongosh
```

On a secondary, **writes** are rejected; **reads** require a read concern/read preference that allows secondaries (e.g. `secondaryPreferred` or `secondary` as above), or historical `rs.secondaryOk()` in older tutorials. Prefer **`readPref('secondaryPreferred')`** on the cursor or **`setReadPref`** as shown.

### URI reminder (replica set + read preference)

From a machine where **`mongo-rs0-*` resolve** (Docker network, or `/etc/hosts`):

```text
mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&readPreference=secondaryPreferred
```

From the **Mac without** `/etc/hosts`, use **`directConnection=true`** for a single port (reads/writes only through that member; not full replica-set routing):

```text
mongodb://127.0.0.1:27017/voice_session_db?directConnection=true
```
