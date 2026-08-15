const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'data', 'db.json');

function migrate(data) {
  data.loans = (data.loans || []).map(l => {
    if (l.monthlyPayment === undefined) {
      const r = (l.rate || 0) / 100;
      const n = l.installments;
      l.monthlyPayment = r === 0 ? l.principal / n : l.principal * r / (1 - Math.pow(1 + r, -n));
    }
    if (!l.startDate) l.startDate = new Date().toISOString().slice(0, 10);
    if (!l.paidInstallments) {
      const paidCount = l.paid || 0;
      l.paidInstallments = Array.from({ length: paidCount }, (_, i) => i + 1);
    }
    delete l.rate;
    delete l.paid;
    return l;
  });
  data.bills = data.bills || [];
  data.billPayments = data.billPayments || [];
  return data;
}

function read() {
  if (!fs.existsSync(FILE)) return { loans: [], bills: [], billPayments: [] };
  const data = migrate(JSON.parse(fs.readFileSync(FILE, 'utf8')));
  write(data);
  return data;
}
function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
module.exports = { read, write };
