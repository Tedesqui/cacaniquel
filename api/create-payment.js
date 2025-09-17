import Stripe from 'stripe';

// Inicialize o Stripe com sua chave secreta.
// IMPORTANTE: Guarde sua chave em variáveis de ambiente, nunca diretamente no código.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Defina os pacotes e seus preços. Use os mesmos IDs do seu frontend.
// ATENÇÃO: O valor para o Stripe deve ser em CENTAVOS (ou a menor unidade da moeda).
const packages = {
    'pack_10_usd': { price_in_cents: 100 },   // $1.00 = 100 centavos
    'pack_25_usd': { price_in_cents: 200 },   // $2.00 = 200 centavos
    'pack_250_usd': { price_in_cents: 1000 } // $10.00 = 1000 centavos
};

export default async function handler(request, response) {
    // Permite apenas requisições do tipo POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { packageId, email } = request.body;
        const selectedPackage = packages[packageId];

        // Validação dos dados recebidos
        if (!selectedPackage || !email) {
            return response.status(400).json({ error: 'Dados insuficientes: packageId ou email faltando.' });
        }

        // Crie a "Intenção de Pagamento" (PaymentIntent) no Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: selectedPackage.price_in_cents, // Valor em centavos
            currency: 'usd',                         // Moeda (dólar americano)
            automatic_payment_methods: {
                enabled: true,
            },
            // Metadata é útil para guardar informações adicionais, como o email ou ID do pacote.
            metadata: {
                packageId: packageId,
                userEmail: email
            }
        });

        // Envie o "client_secret" de volta para o frontend
        response.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Erro na API do Stripe:", error);
        response.status(500).json({ error: 'Falha ao iniciar o pagamento com Stripe.' });
    }
}
