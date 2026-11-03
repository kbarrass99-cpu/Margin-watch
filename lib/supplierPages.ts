// Content for the /price-tracker/<supplier> pages. Every claim here must match
// what the checker really does for that supplier (see lib/scraper.ts and
// lib/supplierParsers.ts): price and stock where it reads them, and nothing
// about variants, which it doesn't track.

export type SupplierPage = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  // How the price is read, in one short phrase.
  source: string;
  readsStock: boolean;
  stockNote?: string;
  placeholder: string;
  example: { label: string; url: string };
  linkSteps: string[];
  tips: string[];
  faq: { q: string; a: string }[];
};

export const SUPPLIER_PAGES: SupplierPage[] = [
  {
    slug: 'aliexpress',
    name: 'AliExpress',
    metaTitle: 'AliExpress price tracker for dropshippers | MarginCanary',
    metaDescription:
      'Track AliExpress supplier prices and get an email when a price rise eats into your margin. Reads prices through the official AliExpress API. Free for 1 product.',
    h1: 'AliExpress price tracker for dropshippers',
    intro:
      'AliExpress sellers change prices without telling you. MarginCanary checks your AliExpress products every 6 hours and emails you when the price moves or your margin falls below the line you set.',
    source: "the official AliExpress API, so AliExpress's robot checks never get in the way",
    readsStock: false,
    stockNote:
      "AliExpress's API doesn't share stock levels, so there are no out-of-stock alerts for AliExpress. If a listing is taken down, the check fails and your dashboard shows it.",
    placeholder: 'https://www.aliexpress.com/item/…',
    example: { label: 'AliExpress', url: 'https://www.aliexpress.com/item/1005012339400657.html' },
    linkSteps: [
      'Open the product on AliExpress, on the website or in the app.',
      'Copy the link. In the app, tap Share, then Copy link. Short links like a.aliexpress.com/… work too.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'MarginCanary tracks the price AliExpress shows for the listing, in US dollars. If you sell in pounds or euros, it converts the price using daily European Central Bank rates before working out your margin.',
      "The listing's main price is tracked, not a particular colour or size, so pick the listing whose main price matches what you buy.",
      'AliExpress runs frequent sales. Price-change emails only go out for moves of 3% or more, so small wobbles don\'t flood your inbox.',
    ],
    faq: [
      {
        q: 'Does it work with AliExpress Choice and Plus listings?',
        a: 'Yes. Any AliExpress product page with an item number can be tracked, whatever badge it has.',
      },
      {
        q: 'Will AliExpress block it?',
        a: 'No. MarginCanary reads AliExpress prices through AliExpress’s own affiliate API rather than loading the web page, so robot checks don’t apply.',
      },
      {
        q: 'Do I get told when an AliExpress product goes out of stock?',
        a: "Not yet. AliExpress's API doesn't share stock levels. You'll get price and margin alerts, and a removed listing shows as a failed check on your dashboard.",
      },
    ],
  },
  {
    slug: 'cjdropshipping',
    name: 'CJdropshipping',
    metaTitle: 'CJdropshipping price and stock alerts | MarginCanary',
    metaDescription:
      'Get an email when a CJdropshipping product changes price or runs out of stock. Reads CJ through its official API. Free for 1 product.',
    h1: 'CJdropshipping price and stock alerts',
    intro:
      'CJ product costs move with the factory and the exchange rate. MarginCanary checks your CJ products every 6 hours and emails you when the price changes, stock runs out, or your margin drops below your line.',
    source: "CJdropshipping's official product API",
    readsStock: true,
    placeholder: 'https://cjdropshipping.com/product/…',
    example: { label: 'CJdropshipping', url: '' },
    linkSteps: [
      'Open the product on cjdropshipping.com (desktop or mobile site).',
      'Copy the link from the address bar. Product links ending in -p-<number>.html and mobile /product/details/ links both work.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'A CJ product with several variants is tracked at its cheapest variant price, the "from" price CJ shows on the listing.',
      'Stock comes from CJ’s warehouse inventory. The out-of-stock alert fires when no variant has stock left anywhere.',
      'CJ prices are in US dollars. MarginCanary converts them into your selling currency before working out your margin.',
    ],
    faq: [
      {
        q: 'Do I need a CJ account or API key?',
        a: 'No. MarginCanary uses its own CJ API connection. You only paste the product link.',
      },
      {
        q: 'Does it include CJ shipping costs?',
        a: 'Shipping isn’t read from CJ. Add your usual shipping and fees per product and MarginCanary includes them in your margin.',
      },
    ],
  },
  {
    slug: 'ebay',
    name: 'eBay',
    metaTitle: 'eBay supplier price tracker | MarginCanary',
    metaDescription:
      'Track eBay listings you buy from and get an email when the price rises or the item sells out. Works with eBay UK, US and other eBay sites. Free for 1 product.',
    h1: 'eBay supplier price tracker',
    intro:
      'If you buy stock from eBay sellers, MarginCanary watches those listings every 6 hours and emails you when the price changes, the item sells out, or your margin falls below your line.',
    source: 'the eBay listing page',
    readsStock: true,
    placeholder: 'https://www.ebay.co.uk/itm/…',
    example: { label: 'eBay', url: 'https://www.ebay.co.uk/itm/375119189634' },
    linkSteps: [
      'Open the listing on eBay.',
      'Copy the link. It contains /itm/ followed by the listing number.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'Track Buy It Now listings. An auction’s price changes with every bid, which would send you an email each time.',
      'Use the eBay site you buy from (ebay.co.uk, ebay.com, ebay.de and so on). The price is read in that site’s currency.',
      'If the seller ends the listing, the check fails and your dashboard tells you, so you know to find a new supplier.',
    ],
    faq: [
      {
        q: 'Which eBay sites work?',
        a: 'eBay UK, US, Germany, France, Italy, Spain, Australia, Canada, Ireland, Austria, Switzerland, the Netherlands, Belgium and Poland.',
      },
      {
        q: 'Does it work with listings that have several options?',
        a: 'Yes, but it tracks the main price shown on the listing, not a specific size or colour.',
      },
    ],
  },
  {
    slug: 'amazon',
    name: 'Amazon',
    metaTitle: 'Amazon price tracker for dropshippers and resellers | MarginCanary',
    metaDescription:
      'Watch the Amazon products you source and get an email when the price rises or they go out of stock. Works with Amazon UK, US, Germany and more. Free for 1 product.',
    h1: 'Amazon price tracker for dropshippers and resellers',
    intro:
      'Sourcing from Amazon only works while the price stays below yours. MarginCanary checks your Amazon products every 6 hours and emails you when the price moves, stock runs out, or your margin drops below your line.',
    source: 'the Amazon product page, read as a shopper in that Amazon country would see it',
    readsStock: true,
    placeholder: 'https://www.amazon.co.uk/dp/…',
    example: { label: 'Amazon', url: 'https://www.amazon.co.uk/dp/B0CP249PYP' },
    linkSteps: [
      'Open the product on the Amazon site you buy from (amazon.co.uk, amazon.com, amazon.de and so on).',
      'Copy the link. Any product link with /dp/ and the product code works.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'The price tracked is the one in the main "Add to basket" box, in that Amazon site’s currency.',
      'Use the country’s own Amazon site, because Amazon shows different prices to different countries.',
      'Amazon changes its pages often. If a check fails, use Report a problem on the product and we’ll look at it straight away.',
    ],
    faq: [
      {
        q: 'Is this Amazon’s own price history?',
        a: 'No. MarginCanary records the price each time it checks, every 6 hours from when you add the product, and shows that history on a chart.',
      },
      {
        q: 'Does it track other sellers’ offers?',
        a: 'It tracks the price in the main buy box, which is what you’d pay if you ordered now.',
      },
    ],
  },
  {
    slug: 'etsy',
    name: 'Etsy',
    metaTitle: 'Etsy supplier price tracker | MarginCanary',
    metaDescription:
      'Track the Etsy listings you buy from and get an email when the price changes or the item sells out. Free for 1 product.',
    h1: 'Etsy supplier price tracker',
    intro:
      'If you resell or bundle items from Etsy makers, MarginCanary checks those listings every 6 hours and emails you when the price moves, the item sells out, or your margin drops below your line.',
    source: 'the Etsy listing page',
    readsStock: true,
    placeholder: 'https://www.etsy.com/listing/…',
    example: { label: 'Etsy', url: 'https://www.etsy.com/uk/listing/1878044676/sofa-phone-stand-couch-phone-stand' },
    linkSteps: [
      'Open the listing on Etsy.',
      'Copy the link. It contains /listing/ followed by the listing number.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'The listing’s main price is tracked, not a particular size or personalisation option.',
      'Prices are read in the currency Etsy shows for the listing. MarginCanary converts them into your selling currency before working out your margin.',
    ],
    faq: [
      {
        q: 'Does it work for digital downloads?',
        a: 'It can read the price, but there’s no stock to track for downloads, so you’d only get price and margin alerts.',
      },
    ],
  },
  {
    slug: 'walmart',
    name: 'Walmart',
    metaTitle: 'Walmart price and stock tracker | MarginCanary',
    metaDescription:
      'Get an email when a Walmart.com product you source changes price or goes out of stock. Free for 1 product.',
    h1: 'Walmart price and stock tracker',
    intro:
      'Walmart prices and stock change fast. MarginCanary checks your Walmart.com products every 6 hours and emails you when the price moves, the item goes out of stock or comes back, or your margin drops below your line.',
    source: "Walmart's own product data on the product page",
    readsStock: true,
    placeholder: 'https://www.walmart.com/ip/…',
    example: { label: 'Walmart', url: 'https://www.walmart.com/ip/WIRESTER-White-Foldable-Phone-Stand-Desk-Adjustable-Portable-Cell-Phone-Holder-iPhone-17-16-15-14-Android-Smartphones-Blue-Glitter-Sparkle-Black-Blue/20644051293' },
    linkSteps: [
      'Open the product on walmart.com.',
      'Copy the link. It contains /ip/ followed by the product name and number.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'Walmart.com (US) only. Prices are in US dollars and converted into your selling currency for your margin.',
      'When an item goes out of stock Walmart often hides its price. You still get the out-of-stock email, and the last known price stays on your dashboard.',
    ],
    faq: [
      {
        q: 'Does it work with Walmart marketplace sellers?',
        a: 'Yes. It tracks the price Walmart shows on the product page, whoever the seller is.',
      },
    ],
  },
  {
    slug: 'dhgate',
    name: 'DHgate',
    metaTitle: 'DHgate price tracker | MarginCanary',
    metaDescription:
      'Track DHgate supplier prices and stock and get an email when they change or your margin gets too thin. Free for 1 product.',
    h1: 'DHgate price tracker',
    intro:
      'MarginCanary checks your DHgate products every 6 hours and emails you when the price changes, stock runs out, or your margin falls below your line.',
    source: 'the DHgate product page',
    readsStock: true,
    placeholder: 'https://www.dhgate.com/product/…',
    example: { label: 'DHgate', url: 'https://www.dhgate.com/product/360-rotating-foldable-metal-phone-stand-adjustable/1123875808.html' },
    linkSteps: [
      'Open the product on dhgate.com.',
      'Copy the link. It contains /product/ followed by the product name and number.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'The price tracked is the one DHgate lists for the product, in US dollars, converted into your selling currency for your margin.',
    ],
    faq: [
      {
        q: 'Does it track bulk-order prices?',
        a: 'It tracks the price DHgate lists on the product page, not every quantity tier.',
      },
    ],
  },
  {
    slug: 'banggood',
    name: 'Banggood',
    metaTitle: 'Banggood price and stock tracker | MarginCanary',
    metaDescription:
      'Get an email when a Banggood product changes price or goes out of stock. Free for 1 product.',
    h1: 'Banggood price and stock tracker',
    intro:
      'MarginCanary checks your Banggood products every 6 hours and emails you when the price changes, stock runs out, or your margin falls below your line.',
    source: 'the Banggood product page',
    readsStock: true,
    placeholder: 'https://www.banggood.com/…',
    example: { label: 'Banggood', url: 'https://uk.banggood.com/4000K-Full-Spectrum-LED-Ceiling-Lamp-Modern-Simple-Bedroom-Lamp-Thin-Thickness-for-Living-Room-Bedroom-Kitchen-p-2032115.html' },
    linkSteps: [
      'Open the product on Banggood (any country site).',
      'Copy the link from the address bar.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: ['The price is read from Banggood’s main product price, with its currency, and converted into your selling currency for your margin.'],
    faq: [
      {
        q: 'Which Banggood sites work?',
        a: 'banggood.com and its country sites, such as uk.banggood.com.',
      },
    ],
  },
  {
    slug: 'shopify-stores',
    name: 'Shopify stores',
    metaTitle: 'Track prices on any Shopify store | MarginCanary',
    metaDescription:
      'Buying from a supplier that runs on Shopify? Get an email when their product price changes or sells out. Free for 1 product.',
    h1: 'Track prices on any Shopify store',
    intro:
      'Many suppliers and wholesalers sell through their own Shopify store. MarginCanary checks those product pages every 6 hours and emails you when the price changes, the product sells out, or your margin drops below your line.',
    source: 'the product data every Shopify store publishes on its product pages',
    readsStock: true,
    placeholder: 'https://store.com/products/…',
    example: { label: 'A Shopify store', url: 'https://www.allbirds.com/products/mens-tree-runners' },
    linkSteps: [
      'Open the product on the supplier’s store.',
      'Copy the link. Shopify product links contain /products/.',
      'Paste it into MarginCanary with the price you sell it for.',
    ],
    tips: [
      'This works for supplier stores built on Shopify. You don’t need access to the store or an app install.',
      'The product’s main price is tracked, in the store’s currency, and converted into yours for your margin.',
    ],
    faq: [
      {
        q: 'Is this a Shopify app?',
        a: 'No. Nothing is installed on any store. You paste the supplier’s product link and MarginCanary checks the public page.',
      },
    ],
  },
];

// Questions every supplier page answers the same way.
export const COMMON_FAQ = [
  {
    q: 'How often are prices checked?',
    a: 'Every 6 hours, automatically. You can also press Check now on any product.',
  },
  {
    q: 'What does it cost?',
    a: 'Tracking 1 product is free, with no card needed. Starter tracks 5 products for $9 a month and Pro tracks 50 for $19 a month, with a 7-day free trial.',
  },
  {
    q: 'What is a margin alert?',
    a: 'Add the price you sell for (and any shipping and fees), choose an alert line such as 20%, and MarginCanary emails you the moment a supplier price change takes your margin to that line or below.',
  },
];

export function supplierPage(slug: string): SupplierPage | undefined {
  return SUPPLIER_PAGES.find((p) => p.slug === slug);
}
