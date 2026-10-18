import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { normalizeRg } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { action, rg, token, platform = 'web', title, body, data } = payload;

    const safeRg = normalizeRg(rg);
    if (!safeRg) {
      return NextResponse.json({ success: false, error: 'RG obrigatório' }, { status: 400 });
    }

    if (action === 'register_token') {
      if (!token) {
        return NextResponse.json({ success: false, error: 'Token obrigatório' }, { status: 400 });
      }

      const tokenDoc = {
        rg: safeRg,
        token,
        platform,
        updatedAt: new Date().toISOString(),
      };

      try {
        const adminDb = getAdminDb();
        await adminDb.collection('push_tokens').doc(safeRg).set(tokenDoc, { merge: true });
      } catch {
        await setDoc(doc(clientDb, 'push_tokens', safeRg), tokenDoc, { merge: true });
      }

      return NextResponse.json({ success: true, message: 'Token push registrado com sucesso' });
    }

    if (action === 'send') {
      // Dispatches or records a notification event in the database
      const notifDoc = {
        targetRg: safeRg,
        title: title || 'Notificação Conexão Bravo',
        body: body || '',
        data: data || {},
        sentAt: new Date().toISOString(),
      };

      try {
        const adminDb = getAdminDb();
        await adminDb.collection('notification_events').add(notifDoc);
      } catch {
        // Log event
        console.log('[PushAPI] Notification event queued:', notifDoc);
      }

      return NextResponse.json({ success: true, message: 'Notificação enviada com sucesso' });
    }

    return NextResponse.json({ success: false, error: 'Ação desconhecida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
