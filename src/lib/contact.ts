export const officialContact = {
  email: "support@ozekiread.org",
  phone: "+256773397375",
  phoneDisplay: "+256 773 397 375",
  address: "Acholi Lane, Gulu City, Uganda",
} as const;

const whatsappNumber = "256773397375";

export const officialContactLinks = {
  mailto: `mailto:${officialContact.email}`,
  tel: `tel:${officialContact.phone}`,
  whatsapp: `https://wa.me/${whatsappNumber}`,
} as const;

export const workspaceCalendarRecipients = [
  "amos@ozekiread.org",
  "support@ozekiread.org",
] as const;

export const donateLinks = {
  paypal:
    "https://www.paypal.com/donate/?business=omario.edwin%40gmail.com&currency_code=USD",
} as const;
