const form = document.querySelector("#gratuityForm");
const salaryInput = document.querySelector("#salary");
const startInput = document.querySelector("#startDate");
const endInput = document.querySelector("#endDate");
const unpaidAbsenceInput = document.querySelector("#unpaidAbsenceDays");
const fullTimeInput = document.querySelector("#fullTime");
const savingsInput = document.querySelector("#notSavingsScheme");
const leavingReasonInputs = document.querySelectorAll("input[name='leavingReason']");

const totalResult = document.querySelector("#totalResult");
const serviceResult = document.querySelector("#serviceResult");
const unpaidAbsenceResult = document.querySelector("#unpaidAbsenceResult");
const dailyResult = document.querySelector("#dailyResult");
const firstTierResult = document.querySelector("#firstTierResult");
const secondTierResult = document.querySelector("#secondTierResult");
const capResult = document.querySelector("#capResult");
const reasonResult = document.querySelector("#reasonResult");
const eligibilityNotice = document.querySelector("#eligibilityNotice");

const { calculateGratuity, formatIsoDate, addCalendarYears } = window.uaeGratuityCore;

const money = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0
});

const preciseMoney = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2
});

function resetResults(message) {
  totalResult.value = "REVIEW_REQUIRED";
  serviceResult.textContent = "-";
  unpaidAbsenceResult.textContent = "-";
  dailyResult.textContent = "-";
  firstTierResult.textContent = "-";
  secondTierResult.textContent = "-";
  capResult.textContent = "-";
  reasonResult.textContent = "-";
  eligibilityNotice.textContent = message;
}

function updateResults() {
  const leavingReason = document.querySelector("input[name='leavingReason']:checked")?.value || "resigned";
  const result = calculateGratuity({
    monthly_basic_salary_aed: Number(salaryInput.value),
    joining_date: startInput.value,
    last_working_date: endInput.value,
    unpaid_absence_days: unpaidAbsenceInput.value,
    employment_context: fullTimeInput.checked ? "uae_private_sector_full_time_general" : "unsupported_context",
    alternative_savings_scheme: !savingsInput.checked,
    leaving_reason: leavingReason
  });

  if (result.error) {
    resetResults(result.error);
    return;
  }

  reasonResult.textContent = leavingReason === "terminated" ? "Terminated by employer" : "Resigned";

  if (result.status === "REVIEW_REQUIRED") {
    totalResult.value = "REVIEW_REQUIRED";
    serviceResult.textContent = "Manual review required";
    unpaidAbsenceResult.textContent = `${Number(unpaidAbsenceInput.value || 0).toLocaleString("en-AE")} days`;
    dailyResult.textContent = "-";
    firstTierResult.textContent = "-";
    secondTierResult.textContent = "-";
    capResult.textContent = "-";
    eligibilityNotice.textContent = result.details;
    return;
  }

  const years = result.service_years.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");

  totalResult.value = money.format(result.estimated_gratuity_aed);
  serviceResult.textContent = `${years} years (${result.eligible_service_days.toLocaleString("en-AE")} eligible days of ${result.total_service_days.toLocaleString("en-AE")} total)`;
  unpaidAbsenceResult.textContent = `${result.unpaid_absence_days.toLocaleString("en-AE")} days`;
  dailyResult.textContent = preciseMoney.format(result.daily_basic_wage_aed);
  firstTierResult.textContent = money.format(result.first_five_years_gratuity_aed);
  secondTierResult.textContent = money.format(result.after_five_years_gratuity_aed);
  capResult.textContent = result.cap_applied ? `Yes, capped at ${money.format(result.cap_aed)}` : `No (${money.format(result.cap_aed)} max)`;

  if (!result.eligible) {
    eligibilityNotice.textContent = "Estimated gratuity is AED 0 because eligible service is below one continuous calendar-anniversary year.";
  } else if (leavingReason === "terminated") {
    eligibilityNotice.textContent = result.leaving_reason_note;
  } else {
    eligibilityNotice.textContent = result.leaving_reason_note;
  }
}

const today = new Date();
const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
startInput.value = formatIsoDate(addCalendarYears(todayUtc, -3));
endInput.value = formatIsoDate(todayUtc);

form.addEventListener("input", updateResults);
leavingReasonInputs.forEach((input) => input.addEventListener("change", updateResults));
updateResults();

window.uaeGratuityCalculator = { calculateGratuity };
