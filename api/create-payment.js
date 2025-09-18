import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import { parse, serialize } from 'cookie';

// Defina os pacotes e preços aqui no backend por segurança
const packages = {
    'pack_10': { chips: 10, price: 5.00 },
    'pack_25': { chips: 25, price: 10.00 },
    'pack_250': { chips: 250, price: 50.00 },
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
        return response.status(500).json({ error: 'Mercado Pago access token not configured.' });
    }

    // --- Gerenciamento de Sessão/Usuário ---
    const cookies = parse(request.headers.cookie || '');
    let userId = cookies.userId;
    if (!userId) {
        userId = uuidv4();
        // Define o cookie para o usuário por 1 ano
        response.setHeader('Set-Cookie', serialize('userId', userId, { path: '/', maxAge: 31536000 }));
    }
    // --- Fim da Sessão ---

    try {
        const { packageId, email, firstName, lastName, cpf } = request.body;
        const selectedPackage = packages[packageId];

        // Validação dos dados recebidos
        if (!selectedPackage || !email || !firstName || !lastName || !cpf) {
            // O erro original acontecia aqui!
            return response.status(400).json({ error: 'Dados insuficientes. Todos os campos são obrigatórios: packageId, email, nome, sobrenome e CPF.' });
        }
        
        const client = new MercadoPagoConfig({ accessToken });

        const paymentBody = {
            transaction_amount: selectedPackage.price,
            description: `${selectedPackage.chips} Fichas para Caça-Níquel`,
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: 'CPF',
                    number: cpf.replace(/\D/g, '') // Remove pontos e traços do CPF
                }
            },
            metadata: {
                user_id: userId,
                package_id: packageId
            },
            notification_url: 'https://seusite.com/api/webhook-mercadopago' // Opcional, mas recomendado
        };

        const payment = await new Payment(client).create({ body: paymentBody });
        
        const paymentId = payment.id;
        const qrCode = payment.point_of_interaction.transaction_data.qr_code;
        const qrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;

        return response.status(201).json({
            paymentId,
            qrCode,
            qrCodeBase64
        });

    } catch (error) {
        console.error("Erro ao criar pagamento no Mercado Pago:", error.cause || error);
        // Retorna a mensagem de erro da API do MP se disponível
        const errorMessage = error.cause?.error?.message || 'Falha ao criar o pagamento PIX.';
        return response.status(500).json({ error: errorMessage });
    }
}
