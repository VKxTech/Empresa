# VKX Technologies / VKX Group

Institucional Premium & CRM Admin

Site institucional ultra moderno com imersão Three.js, CRM básico, links de pagamento e gerador de orçamentos em PDF.

## Tecnologias

- **Backend:** Node.js 20+, Express.js, TypeScript
- **Frontend:** EJS (SSR), TailwindCSS 4, Three.js
- **Banco de Dados:** Prisma + SQLite (Dev) / PostgreSQL (Prod)
- **Segurança:** Helmet, CSRF, Rate Limit, Bcrypt
- **Funcionalidades:** PDF (Puppeteer), E-mail Marketing (Nodemailer + Cron), Pagamentos (MercadoPago/BTG)

## Instalação

1.  Instale as dependências:

    ```bash
    npm install
    ```

2.  Configure o arquivo `.env` (use o `.env.example` como base).

3.  Prepare o banco de dados:

    ```bash
    npm run migrate
    npm run seed
    ```

4.  Compile o CSS e TypeScript:
    ```bash
    npm run build
    ```

## Execução

- **Desenvolvimento:**
  ```bash
  npm run dev
  ```
- **Produção:**
  ```bash
  npm run build
  npm start
  ```

## Acesso Admin

- **URL:** `/admin/login`
- **Email:** `admin@vkx.com.br` (configurável no .env)
- **Senha:** `admin3232` (configurável no .env)

## Estrutura do Projeto

- `src/server.ts`: Ponto de entrada e configuração do servidor.
- `src/routes/`: Definição de rotas públicas, admin e API.
- `src/services/`: Lógica de negócio (E-mail, PDF, Pagamentos).
- `views/`: Templates EJS e layouts.
- `public/`: Assets estáticos, CSS compilado e JS frontend (Three.js).
- `prisma/`: Schema do banco de dados e migrations.

---

Desenvolvido por VKX Technologies.
