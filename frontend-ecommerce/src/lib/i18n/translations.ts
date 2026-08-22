// Central dictionary for the storefront's global chrome (header, footer,
// nav) — deliberately not a routing-level i18n setup (no /[locale]/ URL
// prefix). This app already has every route built without locale
// segments; restructuring the entire route tree to add one was a much
// bigger, riskier change than the actual ask (a working language
// switcher). New keys/strings can be added here incrementally as more of
// the app gets translated — see LanguageContext.tsx for how `t()` reads
// this.
export type Locale = 'tet' | 'en' | 'id' | 'pt';

export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'tet', label: 'Tetun', nativeLabel: 'Tetun' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
];

export const DEFAULT_LOCALE: Locale = 'tet';

type Dictionary = Record<string, string>;

export const translations: Record<Locale, Dictionary> = {
  tet: {
    // Top bar
    'topbar.helpCenter': 'Sentru Ajuda',
    'topbar.advancedOptions': 'Opsaun Avansadu',
    'topbar.getApp': 'Hetan Aplikasaun',
    'topbar.becomeSeller': 'Sai Vendedór',
    'topbar.login': 'Tama',

    // Main nav / header
    'nav.videoShop': 'Loja Vídeo',
    'nav.signIn': 'Tama',
    'nav.profile': 'Perfil',
    'nav.myOrders': 'Hau nia Order sira',
    'nav.wishlist': 'Lista Deseju',
    'nav.settings': 'Configurasaun',
    'nav.logout': 'Sai',

    // Notifications dropdown
    'notif.title': 'Notifikasaun',
    'notif.allCaughtUp': 'Hotu ona lee',
    'notif.unread': 'seidauk lee',
    'notif.markAllRead': 'Marka hotu ona lee',
    'notif.clear': 'Hamos',
    'notif.empty': 'Seidauk iha notifikasaun.',
    'notif.cartEstimate': 'Estimativa Karinhu',
    'notif.basedOnCart': 'Baseia iha karinhu ita-nia agora',
    'notif.subtotal': 'Subtotal',
    'notif.shippingFrom': 'Frete (husi)',
    'notif.tax': 'Taxa',
    'notif.serviceFee': 'Taxa Servisu',
    'notif.estimatedTotal': 'Total Estimadu',
    'notif.finalTotalNote': 'Total final kalkula iha checkout.',

    // Footer
    'footer.tagline': "Merkadu online ida ne'ebé bo'ot liu iha Timor-Leste. Sosa ho konfiansa husi vendedór konfiável husi rai laran tomak.",
    'footer.quickLinks': 'Ligasaun Rápidu',
    'footer.products': 'Produtu',
    'footer.categories': 'Kategoria',
    'footer.sellers': 'Vendedór sira',
    'footer.aboutUs': "Kona-ba Ami",
    'footer.customerService': 'Servisu Kliente',
    'footer.helpCenter': 'Sentru Ajuda',
    'footer.faq': 'Pergunta Oioin',
    'footer.returnsPolicy': 'Polítika Devolusaun',
    'footer.contactUs': 'Kontaktu Ami',
    'footer.contact': 'Kontaktu',
    'footer.rightsReserved': 'Hotu-hotu direitu rezerva.',
    'footer.madeWithLoveFor': "Halo ho domin ba Timor-Leste",

    'lang.switchLabel': 'Lian',
  },

  en: {
    'topbar.helpCenter': 'Help Center',
    'topbar.advancedOptions': 'Advanced Options',
    'topbar.getApp': 'Get App',
    'topbar.becomeSeller': 'Become a Seller',
    'topbar.login': 'Login',

    'nav.videoShop': 'Video Shop',
    'nav.signIn': 'Sign In',
    'nav.profile': 'Profile',
    'nav.myOrders': 'My Orders',
    'nav.wishlist': 'Wishlist',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',

    'notif.title': 'Notifications',
    'notif.allCaughtUp': 'All caught up',
    'notif.unread': 'unread',
    'notif.markAllRead': 'Mark all read',
    'notif.clear': 'Clear',
    'notif.empty': 'No notifications yet.',
    'notif.cartEstimate': 'Cart estimate',
    'notif.basedOnCart': 'Based on your current cart',
    'notif.subtotal': 'Subtotal',
    'notif.shippingFrom': 'Shipping (from)',
    'notif.tax': 'Tax',
    'notif.serviceFee': 'Service fee',
    'notif.estimatedTotal': 'Estimated total',
    'notif.finalTotalNote': 'Final total is calculated at checkout.',

    'footer.tagline': "Timor-Leste's leading online marketplace. Shop with confidence from trusted sellers across the nation.",
    'footer.quickLinks': 'Quick Links',
    'footer.products': 'Products',
    'footer.categories': 'Categories',
    'footer.sellers': 'Sellers',
    'footer.aboutUs': 'About Us',
    'footer.customerService': 'Customer Service',
    'footer.helpCenter': 'Help Center',
    'footer.faq': 'FAQ',
    'footer.returnsPolicy': 'Returns Policy',
    'footer.contactUs': 'Contact Us',
    'footer.contact': 'Contact',
    'footer.rightsReserved': 'All rights reserved.',
    'footer.madeWithLoveFor': 'Made with love for Timor-Leste',

    'lang.switchLabel': 'Language',
  },

  id: {
    'topbar.helpCenter': 'Pusat Bantuan',
    'topbar.advancedOptions': 'Opsi Lanjutan',
    'topbar.getApp': 'Dapatkan Aplikasi',
    'topbar.becomeSeller': 'Jadi Penjual',
    'topbar.login': 'Masuk',

    'nav.videoShop': 'Video Shop',
    'nav.signIn': 'Masuk',
    'nav.profile': 'Profil',
    'nav.myOrders': 'Pesanan Saya',
    'nav.wishlist': 'Daftar Keinginan',
    'nav.settings': 'Pengaturan',
    'nav.logout': 'Keluar',

    'notif.title': 'Notifikasi',
    'notif.allCaughtUp': 'Semua sudah dibaca',
    'notif.unread': 'belum dibaca',
    'notif.markAllRead': 'Tandai semua dibaca',
    'notif.clear': 'Hapus',
    'notif.empty': 'Belum ada notifikasi.',
    'notif.cartEstimate': 'Estimasi Keranjang',
    'notif.basedOnCart': 'Berdasarkan keranjang Anda saat ini',
    'notif.subtotal': 'Subtotal',
    'notif.shippingFrom': 'Ongkir (mulai)',
    'notif.tax': 'Pajak',
    'notif.serviceFee': 'Biaya Layanan',
    'notif.estimatedTotal': 'Estimasi Total',
    'notif.finalTotalNote': 'Total akhir dihitung saat checkout.',

    'footer.tagline': 'Marketplace online terdepan di Timor-Leste. Belanja dengan percaya diri dari penjual terpercaya di seluruh negeri.',
    'footer.quickLinks': 'Tautan Cepat',
    'footer.products': 'Produk',
    'footer.categories': 'Kategori',
    'footer.sellers': 'Penjual',
    'footer.aboutUs': 'Tentang Kami',
    'footer.customerService': 'Layanan Pelanggan',
    'footer.helpCenter': 'Pusat Bantuan',
    'footer.faq': 'FAQ',
    'footer.returnsPolicy': 'Kebijakan Pengembalian',
    'footer.contactUs': 'Hubungi Kami',
    'footer.contact': 'Kontak',
    'footer.rightsReserved': 'Hak cipta dilindungi.',
    'footer.madeWithLoveFor': 'Dibuat dengan cinta untuk Timor-Leste',

    'lang.switchLabel': 'Bahasa',
  },

  pt: {
    'topbar.helpCenter': 'Centro de Ajuda',
    'topbar.advancedOptions': 'Opções Avançadas',
    'topbar.getApp': 'Obter Aplicativo',
    'topbar.becomeSeller': 'Tornar-se Vendedor',
    'topbar.login': 'Entrar',

    'nav.videoShop': 'Loja em Vídeo',
    'nav.signIn': 'Entrar',
    'nav.profile': 'Perfil',
    'nav.myOrders': 'Meus Pedidos',
    'nav.wishlist': 'Lista de Desejos',
    'nav.settings': 'Configurações',
    'nav.logout': 'Sair',

    'notif.title': 'Notificações',
    'notif.allCaughtUp': 'Tudo em dia',
    'notif.unread': 'não lidas',
    'notif.markAllRead': 'Marcar tudo como lido',
    'notif.clear': 'Limpar',
    'notif.empty': 'Ainda sem notificações.',
    'notif.cartEstimate': 'Estimativa do Carrinho',
    'notif.basedOnCart': 'Com base no seu carrinho atual',
    'notif.subtotal': 'Subtotal',
    'notif.shippingFrom': 'Frete (a partir de)',
    'notif.tax': 'Imposto',
    'notif.serviceFee': 'Taxa de Serviço',
    'notif.estimatedTotal': 'Total Estimado',
    'notif.finalTotalNote': 'O total final é calculado no checkout.',

    'footer.tagline': 'O principal mercado online de Timor-Leste. Compre com confiança de vendedores confiáveis em todo o país.',
    'footer.quickLinks': 'Links Rápidos',
    'footer.products': 'Produtos',
    'footer.categories': 'Categorias',
    'footer.sellers': 'Vendedores',
    'footer.aboutUs': 'Sobre Nós',
    'footer.customerService': 'Atendimento ao Cliente',
    'footer.helpCenter': 'Centro de Ajuda',
    'footer.faq': 'Perguntas Frequentes',
    'footer.returnsPolicy': 'Política de Devolução',
    'footer.contactUs': 'Contate-nos',
    'footer.contact': 'Contato',
    'footer.rightsReserved': 'Todos os direitos reservados.',
    'footer.madeWithLoveFor': 'Feito com amor para Timor-Leste',

    'lang.switchLabel': 'Idioma',
  },
};
