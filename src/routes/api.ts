import { Router } from 'express';
import { prisma } from '../server.js';
import { BTGProvider } from '../services/payments/btg.js';
import { MercadoPagoProvider } from '../services/payments/mercadopago.js';

const router = Router();

router.post('/pay/:token/init', async (req, res) => {
    const { token } = req.params;
    const invoice = await prisma.invoice.findUnique({
        where: { token },
        include: { lead: true }
    });

    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    let provider;
    if (invoice.provider === 'btg') {
        provider = new BTGProvider();
    } else {
        provider = new MercadoPagoProvider();
    }

    try {
        const paymentData = await provider.createPayment(invoice);
        
        const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                pixQr: paymentData.pixQr,
                pixCopyPaste: paymentData.pixCopyPaste,
                checkoutUrl: paymentData.checkoutUrl,
                providerRef: paymentData.providerRef
            }
        });

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});

router.get('/pay/:token/status', async (req, res) => {
    const { token } = req.params;
    const invoice = await prisma.invoice.findUnique({
        where: { token }
    });
    res.json({ status: invoice?.status });
});

export default router;
