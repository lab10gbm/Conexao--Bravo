import nodemailer from 'nodemailer';

// Helper to mask an email address for privacy and security (e.g. lcssbernardo@gmail.com -> l***o@gmail.com)
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'e-mail cadastrado';
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}***${last}@${domain}`;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl?: string;
}

// Runtime configuration (can be initialized from Firestore or environment variables)
let runtimeSmtpConfig: SmtpConfig | null = null;

export function setRuntimeSmtpConfig(config: SmtpConfig | null) {
  runtimeSmtpConfig = config;
}

export function getEffectiveSmtpConfig(): { config: SmtpConfig | null; source: 'env' | 'firestore' | 'none' } {
  const envHost = process.env.SMTP_HOST?.trim();
  const envUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const envPass = (process.env.SMTP_PASS || process.env.GMAIL_PASS)?.trim();
  const envPort = Number(process.env.SMTP_PORT) || 587;
  const envSecure = process.env.SMTP_SECURE === 'true' || envPort === 465;
  const envFrom = process.env.SMTP_FROM?.trim();
  const envAppUrl = process.env.APP_URL?.trim();

  // Smart resolution: Prefer Firestore runtime config if explicitly set, else fallback to env
  const host = runtimeSmtpConfig?.host || envHost || 'smtp.gmail.com';
  const user = runtimeSmtpConfig?.user || envUser;
  const pass = runtimeSmtpConfig?.pass || envPass;
  const port = runtimeSmtpConfig?.port || envPort;
  const secure = runtimeSmtpConfig?.secure !== undefined ? runtimeSmtpConfig.secure : envSecure;
  const from = runtimeSmtpConfig?.from || envFrom || (user ? `"Portal CBMERJ" <${user}>` : '"Portal CBMERJ" <no-reply@cbmerj.rj.gov.br>');
  const appUrl = runtimeSmtpConfig?.appUrl || envAppUrl;

  if (host && user && pass) {
    return {
      config: {
        host,
        port,
        secure,
        user,
        pass,
        from,
        appUrl
      },
      source: runtimeSmtpConfig?.pass ? 'firestore' : 'env'
    };
  }

  return { config: null, source: 'none' };
}

interface SendResetEmailParams {
  to: string;
  militarName: string;
  safeRg: string;
  code: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export async function sendPasswordResetEmail({
  to,
  militarName,
  safeRg,
  code,
  resetUrl,
  expiresInMinutes = 15,
}: SendResetEmailParams): Promise<{ delivered: boolean; mode: 'smtp' | 'console'; error?: string }> {
  const cleanTo = to.trim().toLowerCase();
  const { config } = getEffectiveSmtpConfig();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Recuperação de Senha - Portal CBMERJ</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #8B0000 0%, #4A0404 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        .header p { margin: 6px 0 0 0; font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .code-box { background-color: #fef2f2; border: 2px dashed #fca5a5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
        .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #991b1b; letter-spacing: 10px; margin: 0; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
        .footer { background-color: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
        .alert-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Corpo de Bombeiros Militar</h1>
          <p>Portal de Escalas e Permutas</p>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${militarName || 'Militar'}!</div>
          <div class="text">
            Recebemos uma solicitação para redefinição da sua senha de acesso ao Portal CBMERJ (RG: <strong>${safeRg}</strong>).
          </div>

          <div class="code-box">
            <div class="code-label">Seu Código de Segurança</div>
            <div class="code">${code}</div>
            <div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 8px;">Válido por ${expiresInMinutes} minutos</div>
          </div>

          <div class="text" style="text-align: center;">
            Você também pode clicar no botão abaixo para redefinir sua senha diretamente sem precisar digitar o código:
          </div>

          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Redefinir Minha Senha</a>
          </div>

          <div class="alert-box">
            <strong>Aviso de Segurança:</strong> Se você <u>não solicitou</u> esta alteração, não se preocupe: sua senha atual continua válida e ninguém conseguirá acessar sua conta sem este código enviado ao seu e-mail.
          </div>
        </div>
        <div class="footer">
          Mensagem automática enviada pelo sistema de gestão de escalas e permutas.<br>
          Por favor, não responda a este e-mail.
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log the reset code and link to server console for auditing and instant testability
  console.log('========================================================================');
  console.log(`[PASSWORD RESET] Email requested for RG ${safeRg} (${militarName})`);
  console.log(`[PASSWORD RESET] Destinatário: ${cleanTo} (Mascarado: ${maskEmail(cleanTo)})`);
  console.log(`[PASSWORD RESET] Código de 6 Dígitos: ${code}`);
  console.log(`[PASSWORD RESET] Link Direto: ${resetUrl}`);
  console.log('========================================================================');

  if (config && config.host && config.user && config.pass) {
    try {
      const cleanPassword = (config.pass || '').trim().replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user.trim(),
          pass: cleanPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      await transporter.sendMail({
        from: config.from,
        to: cleanTo,
        subject: `Código de Recuperação de Senha: ${code} - Portal CBMERJ`,
        html: htmlContent,
      });

      console.log(`[PASSWORD RESET] E-mail enviado com sucesso via SMTP (${config.host}) para ${cleanTo}`);
      return { delivered: true, mode: 'smtp' };
    } catch (err: any) {
      console.error(`[PASSWORD RESET] Erro ao enviar e-mail via SMTP (${err.message}). O código está registrado no console.`);
      return { delivered: false, mode: 'console', error: err.message };
    }
  }

  console.log('[PASSWORD RESET] Servidor SMTP não configurado. Código registrado apenas em console e retorno da API de teste.');
  return { delivered: false, mode: 'console', error: 'Servidor SMTP não configurado' };
}

// Function to test an SMTP configuration and send a test email
export async function testSmtpConnection(
  targetEmail: string,
  overrideConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; message: string }> {
  const { config: currentConfig } = getEffectiveSmtpConfig();
  const effective: SmtpConfig = {
    host: overrideConfig?.host || currentConfig?.host || '',
    port: overrideConfig?.port || currentConfig?.port || 587,
    secure: overrideConfig?.secure !== undefined ? overrideConfig.secure : (currentConfig?.secure || false),
    user: overrideConfig?.user || currentConfig?.user || '',
    pass: overrideConfig?.pass || currentConfig?.pass || '',
    from: overrideConfig?.from || currentConfig?.from || `"Portal CBMERJ" <${overrideConfig?.user || currentConfig?.user || ''}>`,
  };

  if (!effective.host || !effective.user || !effective.pass) {
    return {
      success: false,
      message: 'Dados incompletos: informe Servidor SMTP (Host), Usuário e Senha de Aplicativo.',
    };
  }

  const cleanTarget = targetEmail.trim().toLowerCase();
  if (!cleanTarget || !cleanTarget.includes('@')) {
    return {
      success: false,
      message: 'Informe um endereço de e-mail de destino válido para o teste.',
    };
  }

  try {
    const cleanPassword = (effective.pass || '').trim().replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      host: effective.host,
      port: effective.port,
      secure: effective.secure,
      auth: {
        user: effective.user.trim(),
        pass: cleanPassword,
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. Send actual test email
    await transporter.sendMail({
      from: effective.from,
      to: cleanTarget,
      subject: '✅ Teste de Envio de E-mail - Portal CBMERJ',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #8B0000; color: #fff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Conexão SMTP Bem-Sucedida!</h2>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <p>Olá!</p>
            <p>Este e-mail confirma que o serviço de envio de mensagens do <strong>Portal de Escalas e Permutas do CBMERJ</strong> está configurado e funcionando corretamente.</p>
            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; margin: 16px 0;">
              <div>Servidor: ${effective.host}:${effective.port}</div>
              <div>Remetente: ${effective.from}</div>
              <div>Data/Hora: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
            <p style="font-size: 12px; color: #64748b;">A recuperação de senha para os militares agora enviará os códigos diretamente para suas respectivas caixas postais.</p>
          </div>
        </div>
      `,
    });

    return {
      success: true,
      message: `E-mail de teste enviado com sucesso para ${cleanTarget}! Verifique sua caixa de entrada e spam.`,
    };
  } catch (err: any) {
    console.error('[SMTP Test Error]', err);
    let friendly = err.message || 'Erro desconhecido ao conectar ao servidor SMTP.';

    if (friendly.includes('Invalid login') || friendly.includes('535-5.7.8') || friendly.includes('Username and Password not accepted')) {
      friendly = 'Usuário ou Senha incorretos. ATENÇÃO: No Gmail, é obrigatório usar uma "Senha de App" de 16 caracteres gerada na Conta Google, e não sua senha pessoal comum.';
    } else if (friendly.includes('ETIMEDOUT')) {
      friendly = 'Tempo esgotado ao tentar alcançar o servidor SMTP. Verifique o endereço do host e a porta (geralmente 587 para TLS ou 465 para SSL).';
    } else if (friendly.includes('ECONNREFUSED')) {
      friendly = 'Conexão recusada pelo servidor. Verifique se o endereço do servidor e a porta estão corretos.';
    }

    return {
      success: false,
      message: friendly,
    };
  }
}
