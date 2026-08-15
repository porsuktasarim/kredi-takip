// Annuity amortization helpers
function monthlyPayment(principal, ratePct, n) {
  const r = ratePct / 100;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}
function remainingBalance(principal, ratePct, n, paidCount) {
  const r = ratePct / 100;
  const M = monthlyPayment(principal, ratePct, n);
  if (r === 0) return Math.max(0, principal - M * paidCount);
  const bal = principal * Math.pow(1 + r, paidCount) - M * ((Math.pow(1 + r, paidCount) - 1) / r);
  return Math.max(0, bal);
}
module.exports = { monthlyPayment, remainingBalance };
