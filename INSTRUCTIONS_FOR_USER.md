# Manual de Configuração do Firebase para 10º GBM (Conexão Bravo)

Para que o sistema de login e recuperação de senhas funcione corretamente, você precisa ativar o provedor de autenticação **E-mail/Senha** no console do Firebase para o projeto **endless-cosine-m3n78**.

Se você encontrar o erro `auth/operation-not-allowed`, siga as etapas abaixo para ativá-lo:

## Link Direto para Configurar a Autenticação:

### Ativar o Provedor de E-mail/Senha:
1. **Clique aqui para ir diretamente à página correspondente no painel do Firebase:**
   👉 [Configurar Métodos de Login - endless-cosine-m3n78](https://console.firebase.google.com/project/endless-cosine-m3n78/authentication/providers)
2. Clique no botão **"Adicionar novo provedor"** (ou "Add new provider").
3. Selecione a opção **"E-mail/Senha"** (ou "Email/Password").
4. Ative a primeira chave **"E-mail/Senha (Ativado)"** e deixe a de "Link do e-mail" desativada.
5. Clique em **"Salvar"** (ou "Save").

---

## Como funciona a autenticação no sistema?
* **RG Militar como Usuário:** O sistema cria um e-mail simulado no formato `RG_Militar@cbmerj.local` de forma transparente no Firebase Auth.
* **Segurança:** O acesso fica totalmente seguro e individual utilizando os servidores do Google Firebase.

## É Gratuito?
**Sim.** A autenticação e o banco de dados do Firebase são 100% gratuitos na cota Spark fornecida pelo Google. Para a unidade do CBA VII / Costa Verde, a franquia diária (~50.000 leituras/dia) é mais do que suficiente para operar sem qualquer custo.
