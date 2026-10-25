// ── Bank constants (Techcombank) ────────────────────────────────────
export const BANK = {
  shortName: 'TCB',
  displayName: 'Techcombank',
  account: '9866647689',
  owner: 'Hay là cà phê',
};

export function buildQrUrl(amount: number, info: string) {
  return `https://img.vietqr.io/image/${BANK.shortName}-${BANK.account}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(info)}`;
}
