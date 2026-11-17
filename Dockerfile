# Van Born Labs MCP server. Default command is Streamable HTTP on port 8080.
# For stdio (Claude Desktop / Cursor / Smithery), run: node dist/index.js
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY actors.json ./
COPY schemas ./schemas
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY actors.json ./
COPY schemas ./schemas
USER node
EXPOSE 8080
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--http", "--host", "0.0.0.0", "--port", "8080"]
