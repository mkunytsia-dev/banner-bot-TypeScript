/**
 * Single source of truth mapping each preview number (1..21) to the template
 * implementation that renders it.
 */
import type { BannerParams } from '../types';

export interface PreviewEntry {
  num: number;
  id: string;
  label: string;
  variant?: string;
  defaults: BannerParams;
}

export const PREVIEWS: PreviewEntry[] = [
  { num: 1, id: 'type-c', label: 'Text in Center — Dark v1', variant: 'v1', defaults: { title: 'The Hardware Layer of Agentic Economy' } },
  { num: 2, id: 'type-c', label: 'Text in Center — Light v2', variant: 'v2', defaults: { title: 'Stake ADA with Everstake. 0% commission.' } },
  { num: 3, id: 'type-c', label: 'Text in Center — Dark v3', variant: 'v3', defaults: { title: 'Future-Proofing Proof of Stake' } },
  { num: 4, id: 'type-c', label: 'Text in Center — Dark v4', variant: 'v4', defaults: { title: 'Stake ADA with Everstake. 0% commission.' } },
  { num: 5, id: 'type-e', label: 'Week in Blockchains', defaults: { dateRange: 'March 30 – April 5', theme: 'light' } },
  { num: 6, id: 'apr', label: 'APR', defaults: { title: 'Annual Percentage Rate', subtitle: 'Aptos - 7.44%', partnerLogo: 'aptos.png' } },
  { num: 7, id: 'collaboration', label: 'Collaboration (Everstake × Partner)', defaults: { partnerLogo: 'aptos-full.svg' } },
  { num: 8, id: 'template-5', label: 'About Blockchain v1', defaults: { title: "Monad's Next Global Initiatives", subtitle: 'Monad Ignites the Builder Economy', partnerLogo: 'partner-horizontal.svg' } },
  { num: 9, id: 'template-6', label: 'About Blockchain v2', defaults: { title: 'Aptos Tokenomics & Staking Rewards Explained', subtitle: 'Is Aptos Inflationary?', partnerLogo: 'aptos-full.svg' } },
  { num: 10, id: 'template-7', label: 'Dark Left Panel', defaults: { title: 'Flagship Projects', subtitle: 'NEO N3', partnerLogo: 'neo-full.svg' } },
  { num: 11, id: 'template-8', label: 'Dark Right Panel', defaults: { title: 'ETH2 Batch Deposit Contract Audited & Secured', partnerLogo: 'aptos-full.svg' } },
  { num: 12, id: 'template-9', label: 'Centered Logo + Title', defaults: { title: 'The Ethereum Foundation Is Set to Stake 70,000 ETH From Treasury', partnerLogo: 'ethereum-full.svg' } },
  { num: 13, id: 'template-10', label: 'Dark Full', defaults: { title: 'Monad fee change', partnerLogo: 'monad.svg' } },
  { num: 14, id: 'template-11', label: 'Collaboration 3 Companies (Light)', defaults: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { num: 15, id: 'template-12', label: 'Collaboration 3 Companies (Dark)', defaults: { title: 'mEVUSD: Regulatory-Compliant Tokenized Strategy', subtitle: 'Targeting 7–12% APY', partnerLogo1: 'collab3-logo1.svg', partnerLogo2: 'collab3-logo2.svg', partnerLogo3: 'collab3-logo3.svg' } },
  { num: 16, id: 'template-13', label: 'Guide / Tutorial', defaults: { title: 'How to stake ADA using Trezor Suite', subtitle: 'Step-by-step guide', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { num: 17, id: 'template-14', label: 'Dark Partner Left', defaults: { title: "Solana's Decentralized Clock Protocol", subtitle: 'A Guide to Proof of History', partnerLogo: 'solana-full.svg' } },
  { num: 18, id: 'template-15', label: 'Dark Text Left + Icon Right', defaults: { title: 'Everstake ICON Validator Will Close After Phase 3', subtitle: 'Network Shrinkage — Mar 23, 2026', partnerLogo: 'icon-network.svg' } },
  { num: 19, id: 'template-16', label: 'Dark Guide', defaults: { title: 'Stake ADA with Everstake. 0% commission.', partnerLogo: 'trezor.svg', cryptoIcon: 'cardano.svg' } },
  { num: 20, id: 'template-17', label: 'Collaboration 2 Companies', defaults: { title: 'Everstake: The First Vault Integration Partner for Sats Terminal', partnerLogo1: 'collab2-logo1.svg', partnerLogo2: 'satsterminal.svg' } },
  { num: 21, id: 'template-18', label: 'Wide Dark + 2 Logos', defaults: { title: 'Improving Network Performance for Solana Validators with DoubleZero', subtitle: 'Everstake Insights:', partnerLogo1: 't18-logo1.svg', partnerLogo2: 'doublezero.svg' } },
];

export function getPreview(num: number): PreviewEntry | null {
  return PREVIEWS.find(p => p.num === num) || null;
}
