const assert = require("node:assert/strict");
const { calculateGratuity } = require("./gratuity-calculation.js");

function estimate(input) {
  const result = calculateGratuity({
    unpaid_absence_days: 0,
    ...input
  });

  assert.equal(result.status, "OK");
  return result;
}

{
  const result = estimate({
    monthly_basic_salary_aed: 10000,
    joining_date: "2023-01-01",
    last_working_date: "2026-01-01"
  });

  assert.equal(result.service_years, 3);
  assert.equal(result.complete_calendar_anniversary_years, 3);
  assert.equal(result.prorated_remaining_years, 0);
  assert.equal(result.estimated_gratuity_aed, 21000);
}

{
  const result = estimate({
    monthly_basic_salary_aed: 30000,
    joining_date: "2020-01-01",
    last_working_date: "2026-01-01"
  });

  assert.equal(result.service_years, 6);
  assert.equal(result.complete_calendar_anniversary_years, 6);
  assert.equal(result.prorated_remaining_years, 0);
  assert.equal(result.estimated_gratuity_aed, 135000);
}

{
  const before = estimate({
    monthly_basic_salary_aed: 10000,
    joining_date: "2023-01-01",
    last_working_date: "2026-01-02"
  });

  const anniversary = estimate({
    monthly_basic_salary_aed: 10000,
    joining_date: "2023-01-01",
    last_working_date: "2026-01-01"
  });

  assert.ok(before.service_years > anniversary.service_years);
  assert.ok(before.estimated_gratuity_aed > anniversary.estimated_gratuity_aed);
}
