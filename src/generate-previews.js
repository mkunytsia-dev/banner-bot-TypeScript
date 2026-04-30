const { renderBanner, closeBrowser } = require('./renderer');
const path = require('path');
const fs = require('fs');

const PREVIEW_DIR = path.resolve(__dirname, '../docs/previews');
if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const previews = [
  // Old templates (type-a through type-f) — will be renamed in docs
  { id: 'type-a', file: 'template-old-a', params: { title: "Monad's Next Global Initiatives", subtitle: 'Monad Ignites the Builder Economy', partnerLogo: 'partner-horizontal.svg', theme: 'light' } },
  { id: 'type-b', file: 'template-old-b', params: { title: 'Selecting the Right Staking Provider', theme: 'light' } },
  { id: 'type-c', file: 'template-1-v1', params: { title: 'The Hardware Layer of Agentic Economy', variant: 'v1' } },
  { id: 'type-c', file: 'template-1-v2', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v2' } },
  { id: 'type-c', file: 'template-1-v3', params: { title: 'Future-Proofing Proof of Stake', variant: 'v3' } },
  { id: 'type-c', file: 'template-1-v4', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v4' } },
  { id: 'type-e', file: 'template-2', params: { dateRange: 'March 30 – April 5', theme: 'light' } },
  { id: 'apr', file: 'template-3', params: { title: 'Annual Percentage Rate', subtitle: 'Aptos - 7.44%', partnerLogo: 'aptos.png' } },
  { id: 'collaboration', file: 'template-4', params: { partnerLogo: 'aptos-full.svg' } },
  { id: 'template-5', file: 'template-5', params: { title: "Monad's Next Global Initiatives", subtitle: 'Monad Ignites the Builder Economy', partnerLogo: 'partner-horizontal.svg' } },
  { id: 'template-6', file: 'template-6', params: { title: 'Aptos Tokenomics & Staking Rewards Explained', subtitle: 'Is Aptos Inflationary?', partnerLogo: 'aptos-full.svg' } },
  { id: 'template-7', file: 'template-7', params: { title: 'Flagship Projects', subtitle: 'NEO N3', partnerLogo: 'neo-full.svg' } },
  { id: 'template-8', file: 'template-8', params: { title: 'ETH2 Batch Deposit Contract Audited & Secured', partnerLogo: 'aptos-full.svg' } },
  { id: 'template-9', file: 'template-9', params: { title: 'The Ethereum Foundation Is Set to Stake 70,000 ETH From Treasury', partnerLogo: 'ethereum-full.svg' } },
  { id: 'template-10', file: 'template-10', params: { title: 'Monad fee change', partnerLogo: 'monad.svg' } },
  { id: 'template-11', file: 'template-11', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { id: 'template-12', file: 'template-12', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { id: 'template-13', file: 'template-13', params: { title: 'How to stake ADA using Trezor Suite', subtitle: 'Step-by-step guide', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { id: 'template-14', file: 'template-14', params: { title: "Solana's Decentralized Clock Protocol", subtitle: 'A Guide to Proof of History', partnerLogo: 'solana-full.svg' } },
  { id: 'template-15', file: 'template-15', params: { title: 'Everstake ICON Validator Will Close After Phase 3', subtitle: 'Network Shrinkage — Mar 23, 2026', partnerLogo: 'icon-network.svg' } },
  { id: 'template-16', file: 'template-16', params: { title: 'Stake ADA with Everstake. 0% commission.', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { id: 'template-17', file: 'template-17', params: { title: 'Everstake: The First Vault Integration Partner for Sats Terminal', partnerLogo1: 'collab2-logo1.svg', partnerLogo2: 'satsterminal.svg' } },
  { id: 'template-18', file: 'template-18', params: { title: 'Improving Network Performance for Solana Validators with DoubleZero', subtitle: 'Everstake Insights:', partnerLogo1: 't18-logo1.svg', partnerLogo2: 'doublezero.svg' } },
];

async function main() {
  for (const { id, file, params } of previews) {
    try {
      const outputPath = await renderBanner(id, params);
      const dest = path.join(PREVIEW_DIR, `${file}.png`);
      fs.copyFileSync(outputPath, dest);
      fs.unlinkSync(outputPath);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
  await closeBrowser();
  console.log('\nDone!');
}

main().catch(console.error);
