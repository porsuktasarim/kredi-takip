const express = require('express');
const cookieParser = require('cookie-parser');
const { read, write } = require('./db');
const { solveMonthlyRate, addMonths, monthOf } = require('./amort');
const langs = require('./lang');

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.query.lang) res.cookie('lang', req.query.lang, { maxAge: 365 * 86400000 });
  req.lang = req.query.lang || req.cookies.lang || 'tr';
  req.t = langs[req.lang] || langs.tr;
  next();
});

function ym(d = new Date()) { return d.toISOString().slice(0, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function loanSchedule(loan) {
  const paidSet = new Set(loan.paidInstallments || []);
  const schedule = [];
  for (let i = 1; i <= loan.installments; i++) {
    schedule.push({
      no: i,
      date: addMonths(loan.startDate, i - 1),
      amount: loan.monthlyPayment,
      paid: paidSet.has(i)
    });
  }
  return schedule;
}

app.get('/', (req, res) => res.redirect('/loans'));

// LOANS
app.get('/loans', (req, res) => {
  const db = read();
  const loans = db.loans.map(l => {
    const paidCount = (l.paidInstallments || []).length;
    const rate = solveMonthlyRate(l.principal, l.monthlyPayment, l.installments);
    return {
      ...l,
      paidCount,
      totalPayment: l.monthlyPayment * l.installments,
      totalInterest: l.monthlyPayment * l.installments - l.principal,
      rate,
      remaining: l.monthlyPayment * (l.installments - paidCount)
    };
  });
  res.render('loans', { t: req.t, lang: req.lang, loans });
});

app.post('/loans/add', (req, res) => {
  const db = read();
  db.loans.push({
    id: Date.now().toString(),
    name: req.body.name,
    principal: parseFloat(req.body.principal),
    monthlyPayment: parseFloat(req.body.monthlyPayment),
    installments: parseInt(req.body.installments),
    startDate: req.body.startDate || todayStr(),
    paidInstallments: []
  });
  write(db);
  res.redirect('/loans');
});

app.post('/loans/:id/delete', (req, res) => {
  const db = read();
  db.loans = db.loans.filter(l => l.id !== req.params.id);
  write(db);
  res.redirect('/loans');
});

app.post('/loans/:id/pay', (req, res) => {
  const db = read();
  const loan = db.loans.find(l => l.id === req.params.id);
  if (loan) {
    const paid = new Set(loan.paidInstallments || []);
    for (let i = 1; i <= loan.installments; i++) {
      if (!paid.has(i)) { paid.add(i); break; }
    }
    loan.paidInstallments = [...paid];
  }
  write(db);
  res.redirect('/loans/' + req.params.id);
});

app.post('/loans/:id/toggle/:no', (req, res) => {
  const db = read();
  const loan = db.loans.find(l => l.id === req.params.id);
  const no = parseInt(req.params.no);
  if (loan) {
    const paid = new Set(loan.paidInstallments || []);
    if (paid.has(no)) paid.delete(no); else paid.add(no);
    loan.paidInstallments = [...paid];
  }
  write(db);
  res.redirect('/loans/' + req.params.id);
});

app.get('/loans/:id', (req, res) => {
  const db = read();
  const loan = db.loans.find(l => l.id === req.params.id);
  if (!loan) return res.redirect('/loans');
  const rate = solveMonthlyRate(loan.principal, loan.monthlyPayment, loan.installments);
  const totalPayment = loan.monthlyPayment * loan.installments;
  const totalInterest = totalPayment - loan.principal;
  const schedule = loanSchedule(loan);
  res.render('loan_detail', { t: req.t, lang: req.lang, loan, rate, totalPayment, totalInterest, schedule });
});

// BILLS
app.get('/bills', (req, res) => {
  const db = read();
  const month = ym();
  const bills = db.bills.map(b => ({
    ...b,
    paidThisMonth: db.billPayments.some(p => p.bill_id === b.id && p.month === month)
  }));
  res.render('bills', { t: req.t, lang: req.lang, bills, month });
});

app.post('/bills/add', (req, res) => {
  const db = read();
  db.bills.push({ id: Date.now().toString(), name: req.body.name, amount: parseFloat(req.body.amount), due_day: parseInt(req.body.due_day) || 1 });
  write(db);
  res.redirect('/bills');
});

app.post('/bills/:id/delete', (req, res) => {
  const db = read();
  db.bills = db.bills.filter(b => b.id !== req.params.id);
  db.billPayments = db.billPayments.filter(p => p.bill_id !== req.params.id);
  write(db);
  res.redirect('/bills');
});

app.post('/bills/:id/toggle', (req, res) => {
  const db = read();
  const month = ym();
  const existing = db.billPayments.find(p => p.bill_id === req.params.id && p.month === month);
  if (existing) {
    db.billPayments = db.billPayments.filter(p => p !== existing);
  } else {
    db.billPayments.push({ bill_id: req.params.id, month });
  }
  write(db);
  res.redirect('/bills');
});

// MONTHLY REPORT
app.get('/report', (req, res) => {
  const db = read();
  const month = req.query.month || ym();
  const items = [];

  db.loans.forEach(loan => {
    const schedule = loanSchedule(loan);
    schedule.forEach(s => {
      if (monthOf(s.date) === month) {
        items.push({ type: 'loan', name: loan.name, date: s.date, amount: s.amount, paid: s.paid, loanId: loan.id, no: s.no });
      }
    });
  });

  db.bills.forEach(bill => {
    const paidThisMonth = db.billPayments.some(p => p.bill_id === bill.id && p.month === month);
    const day = String(bill.due_day).padStart(2, '0');
    items.push({ type: 'bill', name: bill.name, date: `${month}-${day}`, amount: bill.amount, paid: paidThisMonth, billId: bill.id });
  });

  items.sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = items.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0);

  res.render('report', { t: req.t, lang: req.lang, items, month, total, totalUnpaid });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Kredi Takip running on port ' + PORT));
