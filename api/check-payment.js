import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';

const packages = {
    'pack_10': 10,
    'pack_25': 25,
    'pack_100': 100
};

export default async function handler(request, response) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const { paymentId } = request.query;

    if (!accessToken || !paymentId) return response.status(400).json({ error: 'Dados insuficientes.' });

    const client = new MercadoPagoConfig({ accessToken });
    
    try {
        const payment = await new Payment(client).get({ id: Number(paymentId) });
        
        if (payment.status === 'approved') {
            const { user_id, package_id } = payment.metadata;
            const chipsToAdd = packages[package_id] || 0;
            
            if (chipsToAdd > 0) {
                const userBalanceKey = `user:${user_id}:chips`;
                // Verifica se o pagamento já foi processado
                const processed = await kv.get(`payment:${paymentId}:processed`);
                if (!processed) {
                    const newBalance = await kv.incrby(userBalanceKey, chipsToAdd);
                    await kv.set(`payment:${paymentId}:processed`, true, { ex: 86400 }); // Marca como processado
                    return response.status(200).json({ status: 'approved', newBalance });
                }
            }
        }
        
        return response.status(200).json({ status: payment.status });

    } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        return response.status(500).json({ error: 'Falha ao verificar pagamento.' });
    }
}