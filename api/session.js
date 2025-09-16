import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';
import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    const cookies = cookie.parse(request.headers.cookie || '');
    let userId = cookies.userId;

    if (!userId) {
        userId = uuidv4();
        response.setHeader('Set-Cookie', cookie.serialize('userId', userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 365, // 1 ano
            sameSite: 'strict',
            path: '/',
        }));
    }
    
    const userBalanceKey = `user:${userId}:chips`;
    let chipBalance = await kv.get(userBalanceKey);
    
    // ATUALIZAÇÃO: Novos usuários agora recebem 3 fichas
    if (chipBalance === null) {
        chipBalance = 3;
        await kv.set(userBalanceKey, chipBalance);
    }
    
    response.status(200).json({ chipBalance });
}
