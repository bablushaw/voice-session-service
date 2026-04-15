// Run once via mongo-rs0-init: mongosh against mongo-rs0-1.
// Member hosts use host.docker.internal + published ports so:
// - containers replicate via the host port forwards (Docker Desktop / Linux host-gateway)
// - apps on the host (Nest, NoSQLBooster) see a consistent topology

try {
  const st = rs.status();
  if (st.ok === 1) {
    print('Replica set rs0 already initialized');
    quit(0);
  }
} catch (e) {
  // not initialized yet
}

rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'host.docker.internal:27017', priority: 2 },
    { _id: 1, host: 'host.docker.internal:27018', priority: 1 },
    { _id: 2, host: 'host.docker.internal:27019', priority: 1 },
  ],
});

print('Replica set rs0 initiated');
