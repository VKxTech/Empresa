import { PaymentProvider, PaymentResponse } from './provider.js';

export class BTGProvider implements PaymentProvider {
    async createPayment(invoice: any): Promise<PaymentResponse> {
        // Implementação Mock para demo
        console.log(`Criando pagamento BTG para ${invoice.amount}`);
        
        return {
            pixQr: "mock_btg_qr",
            pixCopyPaste: "btg_pix_copy_paste_mock",
            providerRef: "btg_7890"
        };
    }

    async checkStatus(invoice: any): Promise<string> {
        return "pending";
    }
}
