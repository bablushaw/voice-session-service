# Voice Session Service

A backend service for managing voice session lifecycles and conversation event logging, designed for reliability, idempotency, and scalability. Built with [NestJS](https://nestjs.com/) and [MongoDB](https://www.mongodb.com/).

---

## 🚀 Features

- Idempotent APIs for session and event logging
- MongoDB Replica Set and connection pooling support
- OpenAPI/Swagger documentation
- CORS support
- Health/disks checks
- Docker-ready

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x (recommended)
- [Yarn](https://classic.yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [MongoDB](https://docs.mongodb.com/manual/installation/) (standalone or replica set)

---

## ⚙️ Setup

1. **Clone the repository:**
   ```bash
   git clone <YOUR_REPO_URL>
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure environment variables:**

   Copy the example `.env` file:
   ```bash
   cp env.example .env
   ```

   Edit `.env` as needed. Example config:
   ```
   NODE_ENV=development
   PORT=3010

   # Replica config (for MongoDB replica set)
   # MONGODB_URI=mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/voice_session_db?replicaSet=rs0&readPreference=secondaryPreferred

   MONGODB_HOST=localhost
   MONGODB_PORT=27017
   MONGODB_USER=
   MONGODB_PASSWORD=
   MONGODB_NAME=voice_session_db

   MONGODB_MAX_POOL_SIZE=20
   MONGODB_MIN_POOL_SIZE=5

   CORS_ORIGIN=*
   SWAGGER_PATH=api/docs
   ```

   > **Note:** If you are running a replica set, configure the `MONGODB_URI`.

---

## 💻 Running the Service

### Development

```bash
yarn start:dev
# or
npm run start:dev
```

API will be available at: [http://localhost:3010](http://localhost:3010)

### Production

```bash
yarn build
yarn start:prod
# or
npm run build
npm run start:prod
```

---

## 📝 API Docs (Swagger/OpenAPI)

After running, access the Swagger UI at:
```
http://localhost:3010/api/docs
```
_or as set by `SWAGGER_PATH` in your environment variables._

```

---

## 🐳 Docker (Optional)

1. **Build Docker image:**
   ```bash
   docker build -t voice-session-service .
   ```
2. **Run container:**
   ```bash
   docker run -p 3010:3010 --env-file .env voice-session-service
   ```

---

## 🩺 Health Check

- Service root: `GET /health`
- Disk health (optional): Set `HEALTH_DISK_PATH` in `.env` to monitor disk space for a custom path.

---

## 📚 More

- [DESIGN.md](DESIGN.md): Architectural notes, idempotency details, scaling strategy, and index choices.

---

## 🤝 Contributing

Pull requests welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) if available.

---