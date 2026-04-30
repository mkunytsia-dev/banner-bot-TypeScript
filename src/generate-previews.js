const { renderBanner, closeBrowser } = require('./renderer');
const path = require('path');
const fs = require('fs');

const PREVIEW_DIR = path.resolve(__dirname, '../docs/previews');
if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const previews = [
  // Template 1 — Text in Center v1 (Dark, green + yellow)
  { num: 1, id: 'type-c', params: { title: 'The Hardware Layer of Agentic Economy', variant: 'v1' } },
  // Template 2 — Text in Center v2 (Light, green + orange)
  { num: 2, id: 'type-c', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v2' } },
  // Template 3 — Text in Center v3 (Dark, green + teal)
  { num: 3, id: 'type-c', params: { title: 'Future-Proofing Proof of Stake', variant: 'v3' } },
  // Template 4 — Text in Center v4 (Dark, yellow bottom)
  { num: 4, id: 'type-c', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v4' } },
  // Template 5 — Week in Blockchains
  { num: 5, id: 'type-e', params: { dateRange: 'March 30 – April 5', theme: 'light' } },
  // Template 6 — APR
  { num: 6, id: 'apr', params: { title: 'Annual Percentage Rate', subtitle: 'Aptos - 7.44%', partnerLogo: 'aptos.png' } },
  // Template 7 — Collaboration
  { num: 7, id: 'collaboration', params: { partnerLogo: 'aptos-full.svg' } },
  // Template 8 — About Blockchain v1
  { num: 8, id: 'template-5', params: { title: "Monad's Next Global Initiatives", subtitle: 'Monad Ignites the Builder Economy', partnerLogo: 'partner-horizontal.svg' } },
  // Template 9 — About Blockchain v2
  { num: 9, id: 'template-6', params: { title: 'Aptos Tokenomics & Staking Rewards Explained', subtitle: 'Is Aptos Inflationary?', partnerLogo: 'aptos-full.svg' } },
  // Template 10 — Dark Left Panel
  { num: 10, id: 'template-7', params: { title: 'Flagship Projects', subtitle: 'NEO N3', partnerLogo: 'neo-full.svg' } },
  // Template 11 — Dark Right Panel
  { num: 11, id: 'template-8', params: { title: 'ETH2 Batch Deposit Contract Audited & Secured', partnerLogo: 'aptos-full.svg' } },
  // Template 12 — Centered Logo + Title
  { num: 12, id: 'template-9', params: { title: 'The Ethereum Foundation Is Set to Stake 70,000 ETH From Treasury', partnerLogo: 'ethereum-full.svg' } },
  // Template 13 — Dark Full
  { num: 13, id: 'template-10', params: { title: 'Monad fee change', partnerLogo: 'monad.svg' } },
  // Template 14 — Collaboration 3 Companies (Light)
  { num: 14, id: 'template-11', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  // Template 15 — Collaboration 3 Companies (Dark)
  { num: 15, id: 'template-12', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  // Template 16 — Guide / Tutorial
  { num: 16, id: 'template-13', params: { title: 'How to stake ADA using Trezor Suite', subtitle: 'Step-by-step guide', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  // Template 17 — Dark Partner Left
  { num: 17, id: 'template-14', params: { title: "Solana's Decentralized Clock Protocol", subtitle: 'A Guide to Proof of History', partnerLogo: 'solana-full.svg' } },
  // Template 18 — Dark Text Left + Icon Right
  { num: 18, id: 'template-15', params: { title: 'Everstake ICON Validator Will Close After Phase 3', subtitle: 'Network Shrinkage — Mar 23, 2026', partnerLogo: 'icon-network.svg' } },
  // Template 19 — Dark Guide
  { num: 19, id: 'template-16', params: { title: 'Stake ADA with Everstake. 0% commission.', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  // Template 20 — Collaboration 2 Companies
  { num: 20, id: 'template-17', params: { title: 'Everstake: The First Vault Integration Partner for Sats Terminal', partnerLogo1: 'collab2-logo1.svg', partnerLogo2: 'satsterminal.svg' } },
  // Template 21 — Wide Dark + 2 Logos
  { num: 21, id: 'template-18', params: { title: 'Improving Network Performance for Solana Validators with DoubleZero', subtitle: 'Everstake Insights:', partnerLogo1: 't18-logo1.svg', partnerLogo2: 'doublezero.svg' } },
];

async function main() {
  for (const { num, id, params } of previews) {
    try {
      const outputPath = await renderBanner(id, params);
      const dest = path.join(PREVIEW_DIR, `template-${num}.png`);
      fs.copyFileSync(outputPath, dest);
      fs.unlinkSync(outputPath);
      console.log(`✓ Template ${num}`);
    } catch (err) {
      console.error(`✗ Template ${num}: ${err.message}`);
    }
  }
  await closeBrowser();
  console.log('\nDone!');
}

main().catch(console.error);
