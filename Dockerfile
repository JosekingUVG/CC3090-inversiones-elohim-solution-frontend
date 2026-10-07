FROM node:22-alpine AS deps
WORKDIR /app
ENV CI=true
ENV PNPM_CONFIG_CONFIRM_MODULES_PURGE=false
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG BACKEND_API_URL=http://localhost:5000
ARG NEXT_PUBLIC_MAIN_DOMAIN=dmhub.fun
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
ENV CI=true
ENV PNPM_CONFIG_CONFIRM_MODULES_PURGE=false
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV BACKEND_API_URL=${BACKEND_API_URL}
ENV NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
