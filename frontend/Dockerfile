# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Production Server via NGINX
FROM nginx:alpine

# Delete the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy our compiled Vite React App
COPY --from=builder /app/dist /usr/share/nginx/html

# We need custom NGINX config to support React React-Router HTML5 PushState
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
