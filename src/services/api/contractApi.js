/**
 * contractApi.js — Sözleşmeler (Köprü)
 * Eski importların kırılmaması için playerApi'yi re-export eder.
 */
export {
  getContractsState,
  createContractOffer,
  respondContractOffer,
} from './playerApi.js'
