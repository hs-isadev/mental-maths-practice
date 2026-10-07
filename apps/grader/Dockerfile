FROM node:22-slim
WORKDIR /service
COPY package.json .
RUN npm install --omit=dev
COPY server.mjs .
ENV PORT=8788 PIX2TEXT_URL=http://ocr:8503/ocr
EXPOSE 8788
CMD ["npm", "start"]
