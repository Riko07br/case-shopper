## Case desafio

Desenvolvido com React + Vite e NestJs (framework NodeJs)
Para executar o projeto o NodeJs deve estar instalado
Após clonar o repositório este é o processo para inicializar os componentes

### Backend

-	Abra a pasta backend
-   Renomeie o arquivo `.env.example` para `.env` e abra o arquivo, nele estão as variaveis de ambiente MySQL, altere as variaveis para que a conexão com o banco de dados seja bem sucedida
-	Para facilitar os testes, a variável `DATABASE_URL` que está descomentada usa o usuário root do MySQL para acessar o banco de dados.
-   Abra um terminal dentro da pasta backend e execute o comando `npm install` para instalar as dependências.

### Frontend

-	Abra a pasta frontend
-   Renomeie o arquivo `.env.example` para `.env` ele contem a única variavel de ambiente do frontend, caso a URL do backend tenha sido alterada (por padrão `http://localhost:3000/`), isso deve ser alterado neste arquivo para garantir a comunicação correta.
-   Abra outro terminal dentro da pasta frontend e execute o comando `npm install` para instalar as dependências

### Inicializando

-	Inicialize o banco de dados MySQL, o banco de dados deve ter o nome `shopper_db` (se já tiver outro nome, favor alterar a variável `MYSQL_DATABASE` no arquivo `.env` do backend)
-   No terminal do backend execute o comando `npm run start`
-   No terminal do frontend execute o comando `npm run dev`
-	Por padrão o frontend pode ser acessado em `http://localhost:5173/`