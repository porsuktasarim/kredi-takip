const express = require('express');
const cookieParser = require('cookie-parser');
const { read, write } = require('./db');
const { monthlyPayment, remainingBalance } = require('./amort');
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

app.get('/', (req, res) => res.redirect('/loans'));

// LOANS
app.get('/loans', (req, res) => {
  const db = read();
  const loans = db.loans.map(l => ({
    ...l,
    monthly: monthlyPayment(l.principal, l.rate, l.installments),
    remaining: remainingBalance(l.principal, l.rate, l.installments, l.paid)
  }));
  res.render('loans', { t: req.t, lang: req.lang, loans });
});

app.post('/loans/add', (req, res) => {
  const db = read();
  db.loans.push({
    id: Date.now().toString(),
    name: req.body.name,
    principal: parseFloat(req.body.principal),
    rate: parseFloat(req.body.rate) || 0,
    installments: parseInt(req.body.installments),
    paid: 0
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
  if (loan && loan.paid < loan.installments) loan.paid++;
  write(db);
  res.redirect('/loans/' + req.params.id);
});

app.get('/loans/:id', (req, res) => {
  const db = read();
  const loan = db.loans.find(l => l.id === req.params.id);
  if (!loan) return res.redirect('/loans');
  const monthly = monthlyPayment(loan.principal, loan.rate, loan.installments);
  const schedule = [];
  for (let i = 1; i <= loan.installments; i++) {
    schedule.push({ no: i, payment: monthly, paid: i <= loan.paid, remaining: remainingBalance(loan.principal, loan.rate, loan.installments, i) });
  }
  res.render('loan_detail', { t: req.t, lang: req.lang, loan, monthly, schedule });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Kredi Takip running on port ' + PORT));
