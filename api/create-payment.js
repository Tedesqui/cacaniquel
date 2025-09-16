import { MercadoPagoConfig, Payment } from 'mercadopago';
import cookie from 'cookie';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    let { amount, packageId, email } = request.body; // Mudado de const para let
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const cookies = cookie.parse(request.headers.cookie || '');
    const userId = cookies.userId;

    if (!accessToken || !amount || !packageId || !userId || !email) {
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }
    
    // --- LÓGICA DE TESTE ---
    // Se o pacote for o de 250 fichas, altera o valor para 1 real apenas no backend.
    if (packageId === 'pack_250') {
        amount = 1.00;
    }
    // --- FIM DA LÓGICA DE TESTE ---

    const client = new MercadoPagoConfig({ accessToken });

    try {
        const payment = await new Payment(client).create({
            body: {
                transaction_amount: Number(amount),
                description: `Compra de Fichas (${packageId})`,
                payment_method_id: 'pix',
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
