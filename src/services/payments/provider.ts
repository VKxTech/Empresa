export interface PaymentResponse {
    pixQr?: string;
    pixCopyPaste?: string;
    checkoutUrl?: string;
    providerRef: string;
}

export interface PaymentProvider {
    createPayment(invoice: any): Promise<PaymentResponse>;
    checkStatus(invoice: any): Promise<string>;
}
