# Api-clientes

https://github.com/ismaelcheremond-ops/Api-clientes
# API de Gestão de Vendas

API RESTful para gerenciamento de clientes, produtos, usuários e pedidos, desenvolvida como atividade avaliativa da unidade curricular **Desenvolvimento de APIs** (SENAI, Técnico em Informática para Internet).

## Tecnologias

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Express](https://expressjs.com/) 5
- [MySQL](https://www.mysql.com/) com o driver [mysql2](https://github.com/sidorares/node-mysql2) (pool de conexões e *prepared statements*)
- [dotenv](https://github.com/motdotla/dotenv) para variáveis de ambiente
- [nodemon](https://nodemon.io/) para desenvolvimento

## Estrutura do projeto

```
api-clientes/
├── postman/            # Coleção de requisições para testes
├── routes/
│   ├── clientes.js
│   ├── produtos.js
│   ├── usuarios.js
│   └── pedidos.js
├── .env.example        # Modelo das variáveis de ambiente
├── db.js               # Pool de conexão com o MySQL
├── index.js            # Ponto de entrada da aplicação
├── package.json
└── script_banco.sql    # Criação das tabelas e dados iniciais
```

## Como executar

### 1. Clonar e instalar as dependências

```bash
git clone <url-do-repositorio>
cd api-clientes
npm install
```

### 2. Criar o banco de dados

Execute o arquivo `script_banco.sql` no MySQL (pelo DBeaver, MySQL Workbench ou terminal). Ele cria o banco `sistema_clientes`, as tabelas e os dados iniciais.

```bash
mysql -u root -p < script_banco.sql
```

> No DBeaver, use **Alt+X** (Execute Script) para rodar o arquivo inteiro. `Ctrl+Enter` executa apenas a instrução onde o cursor está.

### 3. Configurar as variáveis de ambiente

Copie o modelo e preencha com os dados da sua máquina:

```bash
cp .env.example .env
```

| Variável  | Descrição                              | Exemplo              |
|-----------|----------------------------------------|----------------------|
| `PORT`    | Porta em que a API vai rodar           | `3000`               |
| `DB_HOST` | Endereço do servidor MySQL             | `localhost`          |
| `DB_USER` | Usuário do MySQL                       | `root`               |
| `DB_PASS` | Senha do MySQL                         | `sua_senha`          |
| `DB_NAME` | Nome do banco de dados                 | `sistema_clientes`   |

> O arquivo `.env` contém credenciais e **não deve ser enviado ao repositório**. Mantenha-o no `.gitignore`.

### 4. Iniciar o servidor

```bash
# desenvolvimento (reinicia ao salvar)
npm run dev

# produção
node index.js
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

## Modelo de dados

| Tabela         | Campos principais                                                         |
|----------------|---------------------------------------------------------------------------|
| `clientes`     | `id`, `nome`, `email`, `telefone`                                         |
| `produtos`     | `id`, `nome`, `descricao`, `preco`, `estoque`, `status`, `criado_em`      |
| `usuarios`     | `id`, `nome`, `email` (único), `senha` (hash), `perfil`, `status`         |
| `pedidos`      | `id`, `cliente_id` (FK), `data_pedido`, `status`, `valor_total`           |
| `itens_pedido` | `id`, `pedido_id` (FK), `produto_id` (FK), `quantidade`, `preco_unitario` |

Relacionamentos:

- Um **cliente** possui vários **pedidos**.
- Um **pedido** possui vários **itens**, e cada item referencia um **produto**.

## Endpoints

### Clientes: `/clientes`

| Método   | Rota            | Descrição                |
|----------|-----------------|--------------------------|
| `GET`    | `/clientes`     | Lista todos os clientes  |
| `GET`    | `/clientes/:id` | Busca um cliente         |
| `POST`   | `/clientes`     | Cria um cliente          |
| `PUT`    | `/clientes/:id` | Atualiza um cliente      |
| `DELETE` | `/clientes/:id` | Remove um cliente        |

```json
{
    "nome": "Ana",
    "email": "ana@email.com",
    "telefone": "11999999999"
}
```

### Produtos: `/produtos`

| Método   | Rota            | Descrição                |
|----------|-----------------|--------------------------|
| `GET`    | `/produtos`     | Lista todos os produtos  |
| `GET`    | `/produtos/:id` | Busca um produto         |
| `POST`   | `/produtos`     | Cria um produto          |
| `PUT`    | `/produtos/:id` | Atualiza um produto      |
| `DELETE` | `/produtos/:id` | Remove um produto        |

```json
{
    "nome": "Teclado Mecânico",
    "descricao": "Teclado ABNT2 com switch azul",
    "preco": 250.00,
    "estoque": 20
}
```

### Usuários: `/usuarios`

| Método   | Rota            | Descrição                                      |
|----------|-----------------|------------------------------------------------|
| `GET`    | `/usuarios`     | Lista todos os usuários                        |
| `GET`    | `/usuarios/:id` | Busca um usuário                               |
| `POST`   | `/usuarios`     | Cria um usuário (a senha é salva com hash)     |
| `PUT`    | `/usuarios/:id` | Atualização completa (todos os campos)         |
| `DELETE` | `/usuarios/:id` | Remove um usuário                              |

```json
{
    "nome": "Maria Souza",
    "email": "maria@email.com",
    "senha": "maria123",
    "perfil": "vendedor",
    "status": "ativo"
}
```

Regras:

- No `PUT`, todos os campos são obrigatórios: `nome`, `email`, `senha`, `perfil` e `status`.
- `perfil` e `status` aceitam apenas os valores definidos no banco.
- E-mail repetido retorna `400` (`Email já cadastrado.`).

### Pedidos: `/pedidos`

| Método   | Rota                                | Descrição                                         |
|----------|-------------------------------------|---------------------------------------------------|
| `POST`   | `/pedidos`                          | Cria um pedido para um cliente existente          |
| `GET`    | `/pedidos`                          | Lista os pedidos com os dados do cliente          |
| `GET`    | `/pedidos/:id`                      | Retorna o pedido completo (cliente e itens)       |
| `PUT`    | `/pedidos/:id`                      | Atualização completa (`cliente_id` e `status`)    |
| `PATCH`  | `/pedidos/:id/status`               | Altera apenas o status                            |
| `POST`   | `/pedidos/:id/itens`                | Adiciona um item ao pedido                        |
| `DELETE` | `/pedidos/:id_pedido/itens/:id_item`| Remove um item do pedido                          |

**Criar pedido** (`POST /pedidos`). O status inicia sempre como `pendente`:

```json
{
    "cliente_id": 1
}
```

**Adicionar item** (`POST /pedidos/1/itens`):

```json
{
    "produto_id": 1,
    "quantidade": 2,
    "preco_unitario": 250.00
}
```

**Alterar status** (`PATCH /pedidos/1/status`):

```json
{
    "status": "pago"
}
```

Regras de negócio:

- Status válidos: `pendente`, `pago` e `cancelado`.
- Itens só podem ser adicionados ou removidos de pedidos com status `pendente`.
- `quantidade` deve ser um inteiro maior que zero, e `preco_unitario` um número maior ou igual a zero.
- O `valor_total` do pedido **não é enviado pelo cliente**: é recalculado automaticamente (soma de `quantidade × preco_unitario`) a cada item adicionado ou removido, dentro de uma transação.

## Códigos de resposta

| Código | Significado                                              |
|--------|----------------------------------------------------------|
| `200`  | Operação realizada com sucesso                           |
| `201`  | Recurso criado                                           |
| `400`  | Dados inválidos ou regra de negócio violada              |
| `404`  | Recurso (ou rota) não encontrado                         |
| `500`  | Erro interno (a mensagem detalhada vem em `detalhes`)    |

Exemplo de erro:

```json
{
    "mensagem": "Erro ao remover produto.",
    "detalhes": "descrição técnica do erro"
}
```

## Testes

A coleção de requisições está na pasta `postman/`. Para usar:

1. Abra o Postman (ou Insomnia).
2. Importe o arquivo da coleção.
3. Com o servidor rodando, execute as requisições na ordem: clientes, produtos, usuários e pedidos.

## Problemas comuns

| Erro                                | Causa provável                                                          |
|-------------------------------------|-------------------------------------------------------------------------|
| `No database selected`              | `.env` ausente ou sem `DB_NAME`, ou banco não criado                    |
| `ECONNREFUSED`                      | MySQL não está rodando ou `DB_HOST` está errado                         |
| `Access denied for user`            | `DB_USER` ou `DB_PASS` incorretos                                       |
| Erro de chave estrangeira           | Cliente, pedido ou produto referenciado não existe                      |
| Falha ao excluir produto ou cliente | Registro já está vinculado a um pedido                                  |


