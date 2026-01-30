import { PaymentProvider, PaymentResponse } from './provider.js';

export class MercadoPagoProvider implements PaymentProvider {
    async createPayment(invoice: any): Promise<PaymentResponse> {
        // Implementação Mock para demo (Mudar para Real via SDK)
        console.log(`Criando pagamento MP para ${invoice.amount}`);
        
        return {
            pixQr: "mock_qr_code_base64",
            pixCopyPaste: "00020126580014BR.GOV.BCB.PIX0136...",
            checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
            providerRef: "mp_123456"
        };
    }

    async checkStatus(invoice: any): Promise<string> {
        return "pending";
    }
}
