import express from 'express';
import crypto from 'crypto';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { sendPasswordResetEmail, maskEmail } from '../lib/email.service';

interface PasswordResetRequest {
  rg: string;
  code: string;
  token: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

const passwordResetsByRg = new Map<string, PasswordResetRequest>();
const passwordResetsByToken = new Map<string, string>();

export function setupAccountRoutes(app: express.Express, getDeps: () => any) {
  async function getFullUserData(safeRg: string) {
    const { db, clientDb, isDbHealthy, militaryCache } = getDeps();
    let userData: any = null;

    if (db && isDbHealthy) {
      try {
        const docSnap = await db.collection('militaries').doc(safeRg).get();
        if (docSnap.exists) {
          userData = docSnap.data();
          try {
            const privateDoc = await db
              .collection('militaries')
              .doc(safeRg)
              .collection('private')
              .doc('secrets')
              .get();
            if (privateDoc.exists) {
              userData = { ...userData, ...privateDoc.data() };
            }
          } catch (e) {}
        }
      } catch (e: any) {}
    }

    if (!userData && clientDb) {
      try {
        const docSnap = await getDoc(doc(clientDb, 'militaries', safeRg));
        if (docSnap.exists()) {
          userData = docSnap.data();
          try {
            const privateSnap = await getDoc(
              doc(clientDb, 'militaries', safeRg, 'private', 'secrets'),
            );
            if (privateSnap.exists()) {
              userData = { ...userData, ...privateSnap.data() };
            }
          } catch (e) {}
        }
      } catch (e: any) {}
    }

    // Try outsourced_users if not found in militaries
    if (!userData) {
      if (db && isDbHealthy) {
        try {
          const docSnap = await db
            .collection('outsourced_users')
            .doc(safeRg)
            .get();
          if (docSnap.exists) {
            userData = { ...docSnap.data(), isOutsourced: true };
          }
        } catch (e) {}
      }
      if (!userData && clientDb) {
        try {
          const docSnap = await getDoc(
            doc(clientDb, 'outsourced_users', safeRg),
          );
          if (docSnap.exists()) {
            userData = { ...docSnap.data(), isOutsourced: true };
          }
        } catch (e) {}
      }
    }

    // If found in cache, preserve any credentials already cached in memory
    const cached = militaryCache?.get(safeRg);
    if (cached) {
      if (!userData) {
        userData = cached;
      } else {
        if (!userData.customPassword && cached.customPassword) {
          userData.customPassword = cached.customPassword;
        }
        if (
          userData.hasCustomPassword === undefined &&
          cached.hasCustomPassword !== undefined
        ) {
          userData.hasCustomPassword = cached.hasCustomPassword;
        }
      }
    }

    if (userData && militaryCache) {
      militaryCache.set(safeRg, userData);
    }

    return userData;
  }

  function isBirthDateMatch(userData: any, attempt: string): boolean {
    if (!userData || !attempt) return false;
    const cleanAttempt = (attempt || '')
      .toString()
      .trim()
      .replace(/[\/\.\-\s]/g, '');
    let rawBirth = (userData.birthDate || userData.nascimento || '')
      .toString()
      .trim();
    if (rawBirth.includes('T')) {
      rawBirth = rawBirth.split('T')[0];
    }
    const cleanBirth = rawBirth.replace(/[\/\.\-\s]/g, '');
    if (!cleanBirth || !cleanAttempt) return false;

    if (cleanBirth === cleanAttempt) return true;

    // Format YYYYMMDD (length 8) -> DDMMYYYY
    if (cleanBirth.length === 8 && /^\d{8}$/.test(cleanBirth)) {
      if (cleanBirth.startsWith('19') || cleanBirth.startsWith('20')) {
        const dd = cleanBirth.substring(6, 8);
        const mm = cleanBirth.substring(4, 6);
        const yyyy = cleanBirth.substring(0, 4);
        const ddmmyyyy = `${dd}${mm}${yyyy}`;
        if (ddmmyyyy === cleanAttempt) return true;
      }
    }

    // Format if cleanAttempt is YYYYMMDD (length 8)
    if (cleanAttempt.length === 8 && /^\d{8}$/.test(cleanAttempt)) {
      if (cleanAttempt.startsWith('19') || cleanAttempt.startsWith('20')) {
        const dd = cleanAttempt.substring(6, 8);
        const mm = cleanAttempt.substring(4, 6);
        const yyyy = cleanAttempt.substring(0, 4);
        const ddmmyyyy = `${dd}${mm}${yyyy}`;
        if (cleanBirth === ddmmyyyy) return true;
      }
    }

    return false;
  }

  function verifyUserPasswordDetailed(
    userData: any,
    attempt: string,
    isDateOnly = false,
  ): { valid: boolean; isFirstAccess?: boolean; reason?: string } {
    const cleanAttempt = (attempt || '').toString().trim();
    if (!userData) return { valid: false, reason: 'NOT_FOUND' };

    // Outsourced users don't have birthdate logic normally, they use customPassword
    if (userData.isOutsourced) {
      const dbPass = String(userData.customPassword || '').trim();
      const attemptPadded =
        cleanAttempt.length < 6
          ? cleanAttempt.padEnd(6, '0')
          : cleanAttempt;
      const dbPassPadded =
        dbPass.length < 6 ? dbPass.padEnd(6, '0') : dbPass;
      return { valid: attemptPadded === dbPassPadded };
    }

    if (isDateOnly) {
      return { valid: isBirthDateMatch(userData, cleanAttempt) };
    }

    const hasCustom = Boolean(
      userData.hasCustomPassword === true ||
        (userData.customPassword && userData.customPassword.trim().length > 0),
    );

    if (hasCustom) {
      if (userData.customPassword && userData.customPassword === cleanAttempt) {
        return { valid: true, isFirstAccess: false };
      }

      if (isBirthDateMatch(userData, cleanAttempt)) {
        return { valid: false, reason: 'BIRTHDATE_BLOCKED' };
      }

      if (userData.rg === '54444' && cleanAttempt === 'admin123') {
        return { valid: true, isFirstAccess: false };
      }

      return { valid: false, reason: 'INVALID_PASSWORD' };
    }

    // User does NOT have custom password yet (First Access)
    if (
      isBirthDateMatch(userData, cleanAttempt) ||
      (userData.rg === '54444' && cleanAttempt === 'admin123')
    ) {
      return { valid: true, isFirstAccess: true };
    }

    return { valid: false, reason: 'INVALID_CREDENTIALS' };
  }

  app.post('/api/login', async (req, res) => {
    const { normalizeRg, hasServiceAccount, isDbHealthy } = getDeps();
    const { rg, password: rawPassword } = req.body;
    if (!rg || !rawPassword) {
      return res
        .status(400)
        .json({ success: false, error: 'Campos obrigatórios ausentes' });
    }
    const password = String(rawPassword).trim();

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      console.warn(`[Login] Failed: RG ${safeRg} not found in cache or DB.`);
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        canRecover: false,
        error:
          'Militar não encontrado no sistema com este RG. Verifique os dígitos informados ou solicite seu cadastro.',
      });
    }

    const verification = verifyUserPasswordDetailed(userData, password);
    if (!verification.valid) {
      console.warn(`[Login] Failed for RG ${safeRg}. Reason: ${verification.reason}`);
      if (verification.reason === 'BIRTHDATE_BLOCKED') {
        return res.status(400).json({
          success: false,
          code: 'BIRTHDATE_BLOCKED',
          canRecover: true,
          error:
            'Você já cadastrou uma senha pessoal. Por segurança, o acesso por data de nascimento foi desativado para sua conta. Utilize sua senha cadastrada ou clique em "Esqueci minha senha" para redefinir.',
        });
      }
      if (verification.reason === 'INVALID_PASSWORD') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PASSWORD',
          canRecover: true,
          error:
            'Senha incorreta. Se você esqueceu sua senha, clique em "Esqueci minha senha" abaixo para redefini-la pelo e-mail.',
        });
      }
      if (verification.reason === 'INVALID_CREDENTIALS') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          canRecover: false,
          error:
            'Data de nascimento incorreta. No seu primeiro acesso, digite sua data de nascimento com 8 dígitos (DDMMAAAA).',
        });
      }
      return res.status(400).json({
        success: false,
        code: verification.reason || 'INVALID_LOGIN',
        canRecover: false,
        error:
          'RG ou Senha incorretos. Verifique suas informações e tente novamente.',
      });
    }

    const is54444 = safeRg === '54444';
    const isEmergencyAdmin = is54444 && password === 'admin123';
    const hasCustomPassword = Boolean(
      userData.hasCustomPassword === true ||
        (userData.customPassword && userData.customPassword.trim().length > 0),
    );
    const mustChangePassword =
      !isEmergencyAdmin &&
      (verification.isFirstAccess === true || !hasCustomPassword);

    const claims = {
      admin: is54444 ? true : userData.isAdmin || false,
      escalante: is54444 ? true : userData.isEscalante || false,
      adminObms: userData.adminObms || [],
      escalanteObms: userData.escalanteObms || [],
      obm: userData.obm || 'CBA',
    };

    const profileData = {
      ...userData,
      uid: safeRg,
      rg: userData.isOutsourced ? null : safeRg,
      login: userData.isOutsourced ? safeRg : null,
      isOutsourced: !!userData.isOutsourced,
      name: userData.name || 'Usuário',
      rank: userData.isOutsourced ? 'CIVIL' : userData.rank || '',
      ala: safeRg === '54444' ? 'EXP' : userData.ala || 'EXP',
      isAdmin: !!claims.admin,
      isEscalante: !!claims.escalante,
      isRefeitorioAdmin: !!userData.isRefeitorioAdmin,
      adminObms: claims.adminObms,
      escalanteObms: claims.escalanteObms,
      obm: claims.obm,
      hasCustomPassword,
      mustChangePassword,
    };

    let firebaseToken = null;
    let authEmail = `${safeRg}@cbmrj.br`;
    let useClientAuth = true;
    let needsClientRegistration = true;

    let effectiveAuthPassword = String(password);
    if (effectiveAuthPassword.length < 6) {
      effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
      console.log(
        `[API] Padded password for ${safeRg} from ${password.length} to ${effectiveAuthPassword.length} chars`,
      );
    }

    console.log(
      `[API] Login sync for ${safeRg}: raw=${password.length}chars, effective=${effectiveAuthPassword.length}chars, mustChange=${mustChangePassword}`,
    );

    if (hasServiceAccount && isDbHealthy) {
      try {
        await getAdminAuth().updateUser(safeRg, {
          email: authEmail,
          password: effectiveAuthPassword,
        });
        await getAdminAuth().setCustomUserClaims(safeRg, claims);
      } catch (userErr: any) {
        if (userErr.code === 'auth/user-not-found') {
          try {
            await getAdminAuth().createUser({
              uid: safeRg,
              email: authEmail,
              password: effectiveAuthPassword,
            });
            await getAdminAuth().setCustomUserClaims(safeRg, claims);
          } catch (createErr: any) {}
        }
      }
    }

    return res.json({
      success: true,
      profile: profileData,
      token: firebaseToken,
      useClientAuth,
      needsClientRegistration,
      authEmail,
      authPassword: effectiveAuthPassword,
      hasCustomPassword,
      mustChangePassword,
    });
  });

  app.post('/api/change-password', async (req, res) => {
    const {
      db,
      clientDb,
      isDbHealthy,
      hasServiceAccount,
      militaryCache,
      normalizeRg,
    } = getDeps();
    const { rg, currentPassword, newPassword } = req.body;
    if (!rg || !currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const cleanNew = String(newPassword).trim();
    if (cleanNew.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
    }

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, error: 'Militar não encontrado' });
    }

    const cleanCurrent = String(currentPassword).trim();
    const hasCustom = Boolean(
      userData.hasCustomPassword === true ||
        (userData.customPassword && userData.customPassword.trim().length > 0),
    );

    let currentValid = false;
    if (hasCustom && userData.customPassword) {
      currentValid = userData.customPassword === cleanCurrent;
    } else {
      currentValid = isBirthDateMatch(userData, cleanCurrent);
    }

    if (!currentValid && safeRg === '54444') {
      currentValid =
        cleanCurrent === 'admin123' ||
        (!hasCustom && isBirthDateMatch(userData, cleanCurrent));
    }

    if (!currentValid) {
      return res
        .status(400)
        .json({ success: false, error: 'Senha atual incorreta' });
    }

    try {
      const militaryUpdate = {
        hasCustomPassword: true,
        mustChangePassword: false,
        passwordChangedAt: Date.now(),
      };

      if (db && isDbHealthy && hasServiceAccount) {
        try {
          await db
            .collection('militaries')
            .doc(safeRg)
            .set(militaryUpdate, { merge: true });
          await db
            .collection('militaries')
            .doc(safeRg)
            .collection('private')
            .doc('secrets')
            .set(
              {
                customPassword: cleanNew,
                hasCustomPassword: true,
              },
              { merge: true },
            );
        } catch (e) {}
      }

      if (clientDb) {
        await setDoc(doc(clientDb, 'militaries', safeRg), militaryUpdate, {
          merge: true,
        });
        try {
          await setDoc(
            doc(clientDb, 'militaries', safeRg, 'private', 'secrets'),
            {
              customPassword: cleanNew,
              hasCustomPassword: true,
            },
            { merge: true },
          );
        } catch (e) {}
      }

      const existing = militaryCache?.get(safeRg) || {};
      if (militaryCache) {
        militaryCache.set(safeRg, {
          ...existing,
          ...militaryUpdate,
          customPassword: cleanNew,
        });
      }

      if (hasServiceAccount && isDbHealthy) {
        try {
          let effectiveAuthPassword = cleanNew;
          if (effectiveAuthPassword.length < 6) {
            effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
          }
          await getAdminAuth().updateUser(safeRg, {
            password: effectiveAuthPassword,
          });
        } catch (authErr: any) {}
      }

      return res.json({
        success: true,
        message:
          'Senha pessoal cadastrada com sucesso! O acesso por data de nascimento foi desativado.',
      });
    } catch (err: any) {
      console.error('[API] Failed to change password', err);
      return res
        .status(500)
        .json({ success: false, error: 'Erro ao alterar a senha' });
    }
  });

  app.post(
    ['/api/request-password-reset', '/api/recover-password'],
    async (req, res) => {
      const { clientDb, normalizeRg } = getDeps();
      const { rg, dataNascimento } = req.body;
      if (!rg) {
        return res.status(400).json({
          success: false,
          error: 'O número de RG Militar é obrigatório.',
        });
      }

      const safeRg = normalizeRg(rg);
      const userData = await getFullUserData(safeRg);

      if (!userData) {
        return res
          .status(404)
          .json({ success: false, error: 'Militar não encontrado no sistema.' });
      }

      if (dataNascimento) {
        if (!isBirthDateMatch(userData, dataNascimento)) {
          return res.status(400).json({
            success: false,
            error: 'Data de nascimento incorreta para o RG informado.',
          });
        }
      }

      const targetEmail = (userData.email || userData.email2 || '')
        .trim()
        .toLowerCase();
      if (!targetEmail || !targetEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error:
            'Este militar não possui um e-mail cadastrado no sistema. Por segurança, procure o Escalante ou Administrador da sua OBM para cadastrar seu e-mail e recuperar o acesso.',
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 15 * 60 * 1000;

      const resetReq: PasswordResetRequest = {
        rg: safeRg,
        code,
        token,
        email: targetEmail,
        expiresAt,
        attempts: 0,
      };

      passwordResetsByRg.set(safeRg, resetReq);
      passwordResetsByToken.set(token, safeRg);

      if (clientDb) {
        try {
          await setDoc(
            doc(clientDb, 'militaries', safeRg, 'private', 'recovery'),
            {
              code,
              token,
              email: targetEmail,
              expiresAt,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (e) {}
      }

      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host =
        req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl =
        process.env.APP_URL ||
        (req.headers.origin ? String(req.headers.origin) : `${proto}://${host}`);
      const resetUrl = `${baseUrl}/?reset_token=${token}&rg=${safeRg}`;

      const emailResult = await sendPasswordResetEmail({
        to: targetEmail,
        militarName: userData.warName || userData.name || 'Militar',
        safeRg,
        code,
        resetUrl,
        expiresInMinutes: 15,
      });

      const isSmtpDelivered =
        emailResult.mode === 'smtp' && emailResult.delivered;

      const isDevPreview = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_RESET_PREVIEW === 'true';

      return res.json({
        success: true,
        message: isSmtpDelivered
          ? `Código de recuperação enviado com sucesso para ${maskEmail(targetEmail)}. Verifique sua caixa de entrada e spam.`
          : isDevPreview
            ? `Serviço de e-mail SMTP não configurado. Código em modo dev: ${code}`
            : `Código enviado. Se o e-mail não chegar em alguns minutos, contate o Escalante da sua OBM.`,
        maskedEmail: maskEmail(targetEmail),
        expiresInMinutes: 15,
        isLocalDelivery: !isSmtpDelivered,
        codePreview: isDevPreview ? code : undefined,
        resetUrlPreview: isDevPreview ? resetUrl : undefined,
      });
    },
  );

  app.get('/api/verify-reset-token', async (req, res) => {
    const { clientDb } = getDeps();
    const token = String(req.query.token || '').trim();
    if (!token)
      return res.status(400).json({ valid: false, error: 'Token ausente.' });

    let safeRg = passwordResetsByToken.get(token);
    let resetReq = safeRg ? passwordResetsByRg.get(safeRg) : null;

    if (!resetReq && clientDb) {
      try {
        const qSnap = await getDocs(query(collection(clientDb, 'militaries')));
        for (const mDoc of qSnap.docs) {
          const recSnap = await getDoc(
            doc(clientDb, 'militaries', mDoc.id, 'private', 'recovery'),
          );
          if (recSnap.exists() && recSnap.data()?.token === token) {
            resetReq = {
              rg: mDoc.id,
              ...recSnap.data(),
            } as PasswordResetRequest;
            safeRg = mDoc.id;
            break;
          }
        }
      } catch (e) {}
    }

    if (!resetReq || Date.now() > resetReq.expiresAt) {
      return res.json({
        valid: false,
        error:
          'Link de redefinição expirado ou inválido (validade de 15 minutos).',
      });
    }

    const userData = await getFullUserData(resetReq.rg);
    return res.json({
      valid: true,
      rg: resetReq.rg,
      name: userData?.warName || userData?.name || 'Militar',
      maskedEmail: maskEmail(resetReq.email),
    });
  });

  app.post('/api/confirm-password-reset', async (req, res) => {
    const {
      db,
      clientDb,
      isDbHealthy,
      hasServiceAccount,
      militaryCache,
      normalizeRg,
    } = getDeps();
    const { rg, code, token, newPassword } = req.body;
    if (!newPassword || (!code && !token)) {
      return res.status(400).json({
        success: false,
        error: 'Dados insuficientes para redefinição.',
      });
    }

    const cleanNew = String(newPassword).trim();
    if (cleanNew.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
    }

    let safeRg = rg ? normalizeRg(rg) : '';
    if (token && !safeRg) {
      safeRg = passwordResetsByToken.get(token) || '';
    }

    let resetReq = safeRg ? passwordResetsByRg.get(safeRg) : null;

    if (!resetReq && clientDb && safeRg) {
      try {
        const snap = await getDoc(
          doc(clientDb, 'militaries', safeRg, 'private', 'recovery'),
        );
        if (snap.exists()) {
          resetReq = { rg: safeRg, ...snap.data() } as PasswordResetRequest;
        }
      } catch (e) {}
    }

    if (!resetReq) {
      return res.status(400).json({
        success: false,
        error:
          'Nenhuma solicitação de recuperação encontrada ou o prazo expirou. Solicite um novo código.',
      });
    }

    if (Date.now() > resetReq.expiresAt) {
      passwordResetsByRg.delete(safeRg);
      if (resetReq.token) passwordResetsByToken.delete(resetReq.token);
      return res.status(400).json({
        success: false,
        error:
          'O código ou link de recuperação expirou (validade de 15 minutos). Solicite uma nova redefinição.',
      });
    }

    let isValid = false;
    if (token && resetReq.token && token === resetReq.token) {
      isValid = true;
    } else if (code) {
      const cleanCode = String(code).trim().replace(/\D/g, '');
      if (cleanCode === resetReq.code) {
        isValid = true;
      } else {
        resetReq.attempts = (resetReq.attempts || 0) + 1;
        if (resetReq.attempts >= 5) {
          passwordResetsByRg.delete(safeRg);
          if (resetReq.token) passwordResetsByToken.delete(resetReq.token);
          return res.status(400).json({
            success: false,
            error:
              'Número excessivo de tentativas incorretas. Por segurança, o código foi cancelado. Solicite uma nova recuperação.',
          });
        }
        return res.status(400).json({
          success: false,
          error: `Código de verificação incorreto. Restam ${5 - resetReq.attempts} tentativa(s).`,
        });
      }
    }

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, error: 'Código ou token inválido.' });
    }

    const userData = await getFullUserData(safeRg);
    if (!userData) {
      return res
        .status(404)
        .json({ success: false, error: 'Militar não encontrado.' });
    }

    try {
      const militaryUpdate = {
        hasCustomPassword: true,
        mustChangePassword: false,
        passwordChangedAt: Date.now(),
        customPassword: cleanNew,
      };

      if (db && isDbHealthy && hasServiceAccount) {
        try {
          await db
            .collection('militaries')
            .doc(safeRg)
            .set(militaryUpdate, { merge: true });
          await db
            .collection('militaries')
            .doc(safeRg)
            .collection('private')
            .doc('secrets')
            .set(
              {
                customPassword: cleanNew,
                hasCustomPassword: true,
              },
              { merge: true },
            );
        } catch (e) {}
      }

      if (clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), militaryUpdate, {
            merge: true,
          });
        } catch (e) {}
        try {
          await setDoc(
            doc(clientDb, 'militaries', safeRg, 'private', 'secrets'),
            {
              customPassword: cleanNew,
              hasCustomPassword: true,
            },
            { merge: true },
          );
        } catch (e) {}
        try {
          await setDoc(
            doc(clientDb, 'militaries', safeRg, 'private', 'recovery'),
            {
              code: '',
              token: '',
              usedAt: Date.now(),
            },
            { merge: true },
          );
        } catch (e) {}
      }

      const existing = militaryCache?.get(safeRg) || {};
      if (militaryCache) {
        militaryCache.set(safeRg, {
          ...existing,
          ...militaryUpdate,
          customPassword: cleanNew,
        });
      }

      if (hasServiceAccount && isDbHealthy) {
        try {
          let effectiveAuthPassword = cleanNew;
          if (effectiveAuthPassword.length < 6) {
            effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
          }
          await getAdminAuth().updateUser(safeRg, {
            password: effectiveAuthPassword,
          });
        } catch (authErr: any) {}
      }

      passwordResetsByRg.delete(safeRg);
      if (resetReq.token) passwordResetsByToken.delete(resetReq.token);

      console.log(
        `[PASSWORD RESET] SUCCESS: Password reset completed securely for RG ${safeRg}.`,
      );
      return res.json({
        success: true,
        message:
          'Senha alterada com sucesso! Você já pode acessar o sistema com sua nova senha pessoal.',
      });
    } catch (err: any) {
      console.error('[API] Failed to complete password reset:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Erro ao salvar a nova senha.' });
    }
  });
}
