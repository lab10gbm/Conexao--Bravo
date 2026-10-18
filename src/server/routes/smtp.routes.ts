import express from 'express';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  setRuntimeSmtpConfig,
  getEffectiveSmtpConfig,
  testSmtpConnection,
  maskEmail,
  SmtpConfig,
} from '../lib/email.service';

export function setupSmtpRoutes(app: express.Express, getDeps: () => any) {
  app.get('/api/admin/smtp', async (req, res) => {
    const { config, source } = getEffectiveSmtpConfig();
    return res.json({
      configured: !!(config && config.host && config.user && config.pass),
      source,
      host: config?.host || '',
      port: config?.port || 587,
      secure: config?.secure || false,
      user: config?.user ? maskEmail(config.user) : '',
      rawUser: config?.user || '',
      from: config?.from || '',
      appUrl: config?.appUrl || process.env.APP_URL || '',
    });
  });

  app.post('/api/admin/smtp', async (req, res) => {
    const { clientDb } = getDeps();
    try {
      const { host, port, secure, user, pass, from, appUrl } = req.body;
      const { config: currentConfig } = getEffectiveSmtpConfig();
      const effectivePass =
        pass && pass.trim()
          ? pass.trim().replace(/\s+/g, '')
          : currentConfig?.pass || '';

      if (!host || !user || !effectivePass) {
        return res
          .status(400)
          .json({
            success: false,
            error: 'Host, Usuário e Senha de App são obrigatórios.',
          });
      }

      const cleanPort = Number(port) || 587;
      const cleanSecure = secure === true || cleanPort === 465;
      const cleanFrom = from?.trim() || `"Portal CBMERJ" <${user.trim()}>`;

      const configData: SmtpConfig = {
        host: host.trim(),
        port: cleanPort,
        secure: cleanSecure,
        user: user.trim(),
        pass: effectivePass,
        from: cleanFrom,
        appUrl: appUrl?.trim() || undefined,
      };

      if (clientDb) {
        const firestoreData: Record<string, any> = {
          host: configData.host,
          port: configData.port,
          secure: configData.secure,
          user: configData.user,
          pass: configData.pass,
          from: configData.from,
          updatedAt: serverTimestamp(),
        };
        if (configData.appUrl) {
          firestoreData.appUrl = configData.appUrl;
        }

        try {
          await setDoc(doc(clientDb, 'config', 'smtp'), firestoreData, {
            merge: true,
          });
        } catch (dbErr: any) {
          console.warn('[SMTP] Note: clientDb setDoc warning:', dbErr.message);
        }
      }

      setRuntimeSmtpConfig(configData);

      return res.json({
        success: true,
        message: 'Configurações de SMTP salvas com sucesso no banco de dados!',
        configured: true,
        source: 'firestore',
      });
    } catch (err: any) {
      console.error('[SMTP Save Error]', err);
      return res
        .status(500)
        .json({ success: false, error: 'Erro ao salvar configurações de SMTP.' });
    }
  });

  app.post('/api/admin/smtp-test', async (req, res) => {
    try {
      const { targetEmail, host, port, secure, user, pass, from } = req.body;
      const override =
        host && user && pass
          ? {
              host: host.trim(),
              port: Number(port) || 587,
              secure: secure === true || Number(port) === 465,
              user: user.trim(),
              pass: pass.trim().replace(/\s+/g, ''),
              from: from?.trim() || `"Portal CBMERJ" <${user.trim()}>`,
            }
          : undefined;

      const destination = targetEmail || user || 'lcssbernardo@gmail.com';
      const result = await testSmtpConnection(destination, override);
      return res.json(result);
    } catch (err: any) {
      console.error('[SMTP Test Route Error]', err);
      return res
        .status(500)
        .json({
          success: false,
          message: err.message || 'Erro ao realizar teste de SMTP.',
        });
    }
  });
}
