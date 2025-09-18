import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PACOTES COM PREÇOS ATUALIZADOS EM CENTAVOS DE DÓLAR
const packages = {
    'pack_10_usd': { price_in_cents: 300 },   // $3.00
    'pack_25_usd': { price_in_cents: 500 },   // $5.00
    'pack_100_usd': { price_in_cents: 1000 }  // $10.00
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { packageId, email } = request.body;
        const selectedPackage = packages[packageId];

        if (!selectedPackage || !email) {
            return response.status(400).json({ error: 'Dados insuficientes: packageId ou email faltando.' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: selectedPackage.price_in_cents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                packageId: packageId,
                userEmail: email
            }
        });

        response.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Erro na API do Stripe:", error);
        response.status(500).json({ error: 'Falha ao iniciar o pagamento com Stripe.' });
    }
}
