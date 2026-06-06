const { calculateGratuity } = require("../gratuity-calculation.js");

function calculate(input) {
  return calculateGratuity(input || {});
}

function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Use POST." });
    return;
  }

  response.status(200).json(calculate(request.body || {}));
}

module.exports = handler;
module.exports.calculate = calculate;
