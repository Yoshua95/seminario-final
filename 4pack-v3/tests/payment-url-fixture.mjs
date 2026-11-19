export const acceptedSandboxUrls = [
  "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=fixture",
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect",
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=fixture",
];
export const rejectedSandboxUrls = [
  "http://sandbox.mercadopago.com.ar/checkout/v1/redirect",
  "https://www.mercadopago.com.ar/checkout/v1/redirect",
  "https://mercadopago.com.ar/checkout/v1/redirect",
  "https://sandbox.mercadopago.com.ar.evil.test/checkout/v1/redirect",
  "https://evil-sandbox.mercadopago.com.ar/checkout/v1/redirect",
  "https://sandbox.mercadopago.com.ar@evil.test/checkout/v1/redirect",
  "https://user:pass@sandbox.mercadopago.com.ar/checkout/v1/redirect",
  "https://user@sandbox.mercadopago.com/mla/checkout/pay",
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect/",
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect.evil",
  "https://sandbox.mercadopago.com.ar/checkout/v1/other",
  "https://sandbox.mercadopago.com.ar/checkout/v1/x/../redirect",
  "https://sandbox.mercadopago.com.ar:444/checkout/v1/redirect",
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect#other",
];
