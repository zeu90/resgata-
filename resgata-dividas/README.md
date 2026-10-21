# Resgata+

**Organize suas dívidas. Recupere seu controle.**

Aplicação web para organizar dívidas, acompanhar pagamentos e registrar valores que a pessoa decidiu não apostar.

## Funcionalidades desta etapa
- Cadastro e login com Supabase Auth.
- Painel com valores de dívidas pendentes, vencidas, a vencer e pagas.
- Cadastro, listagem, marcação como paga e exclusão de dívidas.
- Registro e histórico de valores não apostados.
- Atualização do nome no perfil.
- Plano previsto de 7 dias de teste e R$ 9,90/mês; cobrança real ainda não integrada.

## Tecnologias
Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase Auth e PostgreSQL.

## Executar localmente
1. Execute `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Aplique `supabase/migrations/0001_initial_schema.sql` no projeto Supabase se ainda não foi aplicada.
5. Configure os URLs permitidos em Authentication no Supabase.
6. Execute `npm run dev`.

## Verificar
Execute `npm run lint` e `npm run build`.

## Segurança
- Nunca exponha a chave `service_role` em variáveis `NEXT_PUBLIC_`.
- Mantenha Row Level Security (RLS) ativada nas tabelas.
- Verifique se as políticas RLS isolam cada usuário antes de usar dados reais.
- Não execute a migração repetidamente sem conferir as tabelas e políticas existentes.

## Pagamentos
A integração real da InfinityPay, validação de webhooks, criação de cobrança e cancelamento ainda precisam ser implementados no backend. Nunca confie no navegador para definir o estado da assinatura.

## Publicação
Antes de publicar, configure as variáveis de ambiente de produção e teste cadastro, login, acesso aos dados e isolamento entre contas. Confirme a compatibilidade da plataforma de hospedagem escolhida com o modo de execução do Next.js.
