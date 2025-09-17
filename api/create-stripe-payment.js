import Stripe from 'stripe';

// 1. Inicialize o Stripe com sua chave secreta a partir das variáveis de ambiente.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 2. Defina os pacotes e seus preços em CENTAVOS.
//    Isso é MUITO IMPORTANTE: Stripe trabalha com a menor unidade da moeda.
//    $1.00 = 100 centavos, $10.00 = 1000 centavos, etc.
const packages = {
    'pack_10_usd': { price_in_cents: 100 },   // $1.00
    'pack_25_usd': { price_in_cents: 200 },   // $2.00
    'pack_250_usd': { price_in_cents: 1000 } // $10.00
};

export default async function handler(request, response) {
    // Permite apenas requisições do tipo POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { packageId, email } = request.body;
        const selectedPackage = packages[packageId];

        // Valida se os dados necessários foram enviados pelo frontend
        if (!selectedPackage || !email) {
            return response.status(400).json({ error: 'Dados insuficientes: packageId ou email faltando.' });
        }

        // 3. Crie a "Intenção de Pagamento" (PaymentIntent) no Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: selectedPackage.price_in_cents, // Valor em centavos
            currency: 'usd',                         // Moeda (use 'brl' para Real, 'usd' para Dólar, etc.)
            automatic_payment_methods: {
                enabled: true,
            },
            // Metadata é um bom lugar para guardar informações extras para sua referência
            metadata: {
                packageId: packageId,
                userEmail: email
            }
        });

        // 4. Envie o "client_secret" de volta para o frontend
        //    O frontend precisa disso para confirmar o pagamento.
        response.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Erro na API do Stripe:", error);
        response.status(500).json({ error: 'Falha ao iniciar o pagamento com Stripe.' });
    }
}