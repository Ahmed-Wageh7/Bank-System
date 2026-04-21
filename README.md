# ATM Mongo NTI API

Production-ready Express + Mongoose ATM API connected to MongoDB Atlas.

## Setup

1. Copy `.env.example` to `.env`
2. Update values if needed
3. Start the app:

```bash
npm run dev
```

For production:

```bash
npm start
```

## Environment Variables

- `PORT`: API port
- `MONGO_URI`: Atlas connection string
- `MONGO_DB_NAME`: target database name
- `NODE_ENV`: application environment

## Endpoints

- `GET /health`
- `POST /users`
- `GET /users`
- `GET /users/:cardNumber`
- `PATCH /users/deposit`
- `PATCH /users/withdraw`
- `PATCH /users/transfer`
- `PATCH /users/:cardNumber/disable`
- `PATCH /users/:cardNumber/restore`
