import { renderBanner, closeBrowser } from './renderer';
import path from 'path';
import fs from 'fs';
import type { BannerParams } from './types';

const PREVIEW_DIR = path.resolve(__dirname, '../docs/previews');
if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });

interface PreviewSpec {
  num: number;
  id: string;
  params: BannerParams;
}

const previews: PreviewSpec[] = [
  { num: 1, id: 'type-c', params: { title: 'The Hardware Layer of Agentic Economy', variant: 'v1' } },
  { num: 2, id: 'type-c', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v2' } },
  { num: 3, id: 'type-c', params: { title: 'Future-Proofing Proof of Stake', variant: 'v3' } },
  { num: 4, id: 'type-c', params: { title: 'Stake ADA with Everstake. 0% commission.', variant: 'v4' } },
  { num: 5, id: 'type-e', params: { dateRange: 'March 30 – April 5', theme: 'light' } },
  { num: 6, id: 'apr', params: { title: 'Annual Percentage Rate', subtitle: 'Aptos - 7.44%', partnerLogo: 'aptos.png' } },
  { num: 7, id: 'collaboration', params: { partnerLogo: 'aptos-full.svg' } },
  { num: 8, id: 'template-5', params: { title: "Monad's Next Global Initiatives", subtitle: 'Monad Ignites the Builder Economy', partnerLogo: 'partner-horizontal.svg' } },
  { num: 9, id: 'template-6', params: { title: 'Aptos Tokenomics & Staking Rewards Explained', subtitle: 'Is Aptos Inflationary?', partnerLogo: 'aptos-full.svg' } },
  { num: 10, id: 'template-7', params: { title: 'Flagship Projects', subtitle: 'NEO N3', partnerLogo: 'neo-full.svg' } },
  { num: 11, id: 'template-8', params: { title: 'ETH2 Batch Deposit Contract Audited & Secured', partnerLogo: 'aptos-full.svg' } },
  { num: 12, id: 'template-9', params: { title: 'The Ethereum Foundation Is Set to Stake 70,000 ETH From Treasury', partnerLogo: 'ethereum-full.svg' } },
  { num: 13, id: 'template-10', params: { title: 'Monad fee change', partnerLogo: 'monad.svg' } },
  { num: 14, id: 'template-11', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { num: 15, id: 'template-12', params: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { num: 16, id: 'template-13', params: { title: 'How to stake ADA using Trezor Suite', subtitle: 'Step-by-step guide', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { num: 17, id: 'template-14', params: { title: "Solana's Decentralized Clock Protocol", subtitle: 'A Guide to Proof of History', partnerLogo: 'solana-full.svg' } },
  { num: 18, id: 'template-15', params: { title: 'Everstake ICON Validator Will Close After Phase 3', subtitle: 'Network Shrinkage — Mar 23, 2026', partnerLogo: 'icon-network.svg' } },
  { num: 19, id: 'template-16', params: { title: 'Stake ADA with Everstake. 0% commission.', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { num: 20, id: 'template-17', params: { title: 'Everstake: The First Vault Integration Partner for Sats Terminal', partnerLogo1: 'collab2-logo1.svg', partnerLogo2: 'satsterminal.svg' } },
  { num: 21, id: 'template-18', params: { title: 'Improving Network Performance for Solana Validators with DoubleZero', subtitle: 'Everstake Insights:', partnerLogo1: 't18-logo1.svg', partnerLogo2: 'doublezero.svg' } },
];

async function main(): Promise<void> {
  for (const { num, id, params } of previews) {
    try {
      const outputPath = await renderBanner(id, params);
      const dest = path.join(PREVIEW_DIR, `template-${num}.png`);
      fs.copyFileSync(outputPath, dest);
      fs.unlinkSync(outputPath);
      console.log(`✓ Template ${num}`);
    } catch (err) {
      console.error(`✗ Template ${num}: ${(err as Error).message}`);
    }
  }
  await closeBrowser();
  console.log('\nDone!');
}

main().catch(console.error);
