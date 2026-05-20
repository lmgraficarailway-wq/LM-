# MS | PASSO - Sistema de Gestão de Produção

Sistema de gerenciamento de pedidos estilo Kanban para gráfica, com controle de estoque, fluxo de produção e entregas.

## 🚀 Funcionalidades

- **Kanban Interativo**: Colunas para Aguardando Aceite, Produção, Em Balcão e Finalizado.
- **Perfis de Usuário**: Master, Vendedor, Produção, Financeiro, Interno.
- **Controle de Estoque**: Gestão de quantidade de produtos e baixa automática/manual com justificativa de perda.
- **Fluxo de Entrega**: Geração de etiquetas (57x50mm) e upload de foto para comprovação de entrega.
- **Executável Windows**: Funciona sem instalação, abrindo automaticamente o navegador.

## 🛠️ Como Rodar (Código Fonte)

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
3.  Acesse `http://localhost:3000`.

## 📦 Como Gerar o Executável

Para criar o arquivo `.exe` standalone:

1.  Execute o script de build:
    ```bash
    npm run build
    ```
2.  O arquivo `lm-passo.exe` será gerado na raiz.

## 🔑 Credenciais Iniciais

*   **Master**: `admin` / `123456`
*   **Vendedor**: `vendedor` / `123456`
*   **Produção**: `producao` / `123456`

## 📁 Estrutura de Arquivos Importantes

*   `database.sqlite`: Banco de dados (criado automaticamente ao rodar).
*   `public/uploads/`: Pasta onde as fotos de entrega são salvas.
*   `error_log.txt`: Log de erros caso o executável falhe.
