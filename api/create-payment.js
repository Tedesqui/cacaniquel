import { MercadoPagoConfig, Payment } from 'mercadopago';
import cookie from 'cookie';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    // ATUALIZAÇÃO: Recebe também o 'email' do frontend
    const { amount, packageId, email } = request.body;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const cookies = cookie.parse(request.headers.cookie || '');
    const userId = cookies.userId;

    if (!accessToken || !amount || !packageId || !userId || !email) {
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }
    
    const client = new MercadoPagoConfig({ accessToken });

    try {
        const payment = await new Payment(client).create({
            body: {
                transaction_amount: Number(amount),
                description: `Compra de Fichas (${packageId})`,
                payment_method_id: 'pix',
                // ATUALIZAÇÃO: Usa o e-mail real do usuário
                payer: { email: email }, 
                metadata: {
                    user_id: userId,
                    package_id: packageId
                }
            }
        });
        
        response.status(201).json({ 
            paymentId: payment.id,
            qrCodeBase64: payment.point_of_interaction.transaction_data.qr_code_base64,
        });

    } catch (error) {
        console.error("Erro ao criar pagamento:", error);
        response.status(500).json({ error: 'Falha ao gerar PIX.' });
    }
}
