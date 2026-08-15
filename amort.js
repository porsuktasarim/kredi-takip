// Reverse amortization: principal + monthly payment + installment count -> implied interest rate
function pv(r, M, n) {
  if (r === 0) return M * n;
  return M * (1 - Math.pow(1 + r, -n)) / r;
}
function solveMonthlyRate(principal, payment, n) {
  if (payment * n <= principal) return 0; // no interest / already covers it
  let lo = 1e-8, hi = 2; // 0% .. 200% monthly (safe upper bound)
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid, payment, n) > principal) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}
function monthOf(dateStr) { return dateStr.slice(0, 7); }

module.exports = { pv, solveMonthlyRate, addMonths, monthOf };
