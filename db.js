const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'data', 'db.json');

function read() {
  if (!fs.existsSync(FILE)) return { loans: [], bills: [], billPayments: [] };
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
module.exports = { read, write };
