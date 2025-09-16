import cookie from 'cookie';
import { kv } from '@vercel/kv';

const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    const cookies = cookie.parse(request.headers.cookie || '');
    const userId = cookies.userId;
    const { betAmount } = request.body;

    if (!userId || !betAmount || betAmount <= 0) {
        return response.status(400).json({ error: 'Aposta inválida.' });
    }

    const userBalanceKey = `user:${userId}:chips`;

    try {
        let currentBalance = await kv.get(userBalanceKey);
        
        if (currentBalance === null || currentBalance < betAmount) {
            return response.status(402).json({ error: 'Fichas insuficientes!' });
        }

        // Debita a aposta
        currentBalance = await kv.decrby(userBalanceKey, betAmount);

        // --- INÍCIO DA LÓGICA ANTI-VITÓRIA ---
        
        // Sorteia os três símbolos
        let s1 = symbols[Math.floor(Math.random() * symbols.length)];
        let s2 = symbols[Math.floor(Math.random() * symbols.length)];
        let s3 = symbols[Math.floor(Math.random() * symbols.length)];

        // Enquanto os três forem iguais, sorteia o terceiro novamente
        while (s1 === s2 && s2 === s3) {
            s3 = symbols[Math.floor(Math.random() * symbols.length)];
        }
        
        const resultSymbols = [s1, s2, s3];
        const winnings = 0; // O prêmio é sempre zero.
        
        // --- FIM DA LÓGICA ANTI-VITÓRIA ---
        
        const newBalance = currentBalance;
        
        response.status(200).json({
            symbols: resultSymbols,
            winnings,
            newBalance,
        });

    } catch (error) {
        console.error("Erro no giro:", error);
        response.status(500).json({ error: 'Erro no servidor. Tente novamente.' });
    }
}