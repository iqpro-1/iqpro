FROM node:20

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta (ajuste se seu server usa outra porta!)
EXPOSE 10000

# Comando para rodar seu backend
CMD ["node", "server.js"]
