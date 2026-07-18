FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

ENV DATABASE_URL="postgresql://appuser:apppass@localhost:5432/appdb"

RUN npm run build

RUN npm prune --omit=dev --ignore-scripts

EXPOSE 3000

CMD ["npm", "start"]