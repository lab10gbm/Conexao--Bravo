# Manual de Configuração do Firebase para 10º GBM

Para que o seu banco de dados funcione corretamente e não fique carregando infinitamente, você precisa realizar dois passos rápidos no console do Firebase para o projeto **ai-studio-applet-webapp-33cfe**.

## Links Diretos para seu Projeto:

### 1. Ativar o Firestore
O erro de permissão ocorre porque o banco de dados ainda não foi inicializado.
- **Clique aqui:** [Console do Firestore - ai-studio-applet-webapp-33cfe](https://console.firebase.google.com/project/ai-studio-applet-webapp-33cfe/firestore)
- Clique em **"Criar banco de dados"**.
- Escolha o local mais próximo (ex: `southamerica-east1` ou `us-east1`).
- Comece em **"Modo de Produção"**. (O código já envia as regras de segurança para proteger seus dados).

### 2. Ativar Autenticação Anônima
Fundamental para o login por RG sem senha.
- **Clique aqui:** [Configurar Login - ai-studio-applet-webapp-33cfe](https://console.firebase.google.com/project/ai-studio-applet-webapp-33cfe/authentication/providers)
- Role até **Anônimo**, clique nele e mude a chave para **Ativado**.
- Clique em **Salvar**.

## Adicionar lab.10gbm@gmail.com como Dono
Se você quer que este e-mail tenha acesso total ao banco de dados:
1. Vá em [Usuários e Permissões](https://console.firebase.google.com/project/ai-studio-applet-webapp-33cfe/settings/iam).
2. Clique em **Adicionar membro**.
3. Digite `lab.10gbm@gmail.com`.
4. Em "Papel" ou "Role", escolha **Proprietário** (Owner) ou **Editor**.

## É Gratuito?
**Sim.** O Google permite até 50.000 leituras e 20.000 escritas **por dia** sem cobrar nada. Para uma unidade como o 10º GBM, este limite é muito alto e provavelmente você nunca pagará nada pelo uso do banco de dados.

---
**Nota sobre o projeto `gen-lang-client-...`**:
Aquele projeto que você mencionou é provavelmente sua conta pessoal do Google. O sistema do AI Studio criou este projeto dedicado chamado **ai-studio-applet-webapp-33cfe** para hospedar esta aplicação específica. Use os links acima para configurar este projeto correto.
