(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.uaeGratuityCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const REVIEW_REQUIRED = "REVIEW_REQUIRED";
  const SUPPORTED_CONTEXT = "uae_private_sector_full_time_general";

  function parseIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function formatIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function addCalendarYears(date, years) {
    const year = date.getUTCFullYear() + years;
    const month = date.getUTCMonth();
    if (month === 1 && date.getUTCDate() === 29 && daysInMonth(year, month) < 29) {
      return new Date(Date.UTC(year, 2, 1));
    }
    const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * MS_PER_DAY);
  }

  function daysBetweenExclusive(startInclusive, endExclusive) {
    return Math.max(0, Math.round((endExclusive.getTime() - startInclusive.getTime()) / MS_PER_DAY));
  }

  function daysBetweenInclusive(startInclusive, endInclusive) {
    return daysBetweenExclusive(startInclusive, addDays(endInclusive, 1));
  }

  function exactCalendarAnniversaryYears(startDate, endDate) {
    if (endDate < startDate) {
      return 0;
    }

    let years = Math.max(0, endDate.getUTCFullYear() - startDate.getUTCFullYear());
    let anniversary = addCalendarYears(startDate, years);

    if (anniversary > endDate) {
      years -= 1;
      anniversary = addCalendarYears(startDate, years);
    }

    return years > 0 && anniversary.getTime() === endDate.getTime() ? years : 0;
  }

  function calculateServiceBreakdown(startDate, endDate, unpaidAbsenceDays) {
    const anniversaryYears = exactCalendarAnniversaryYears(startDate, endDate);
    const grossServiceDays = anniversaryYears > 0
      ? daysBetweenExclusive(startDate, endDate)
      : daysBetweenInclusive(startDate, endDate);
    const eligibleServiceDays = grossServiceDays - unpaidAbsenceDays;
    let remainingEligibleDays = eligibleServiceDays;
    let completeYears = 0;
    let proratedYears = 0;
    let firstTierYearUnits = 0;
    let secondTierYearUnits = 0;
    let cursor = startDate;
    let serviceYearIndex = 0;

    while (remainingEligibleDays > 0) {
      const nextAnniversary = addCalendarYears(startDate, serviceYearIndex + 1);
      const serviceYearDays = daysBetweenExclusive(cursor, nextAnniversary);
      const daysInThisYear = Math.min(remainingEligibleDays, serviceYearDays);
      const yearUnit = daysInThisYear / serviceYearDays;

      if (serviceYearIndex < 5) {
        firstTierYearUnits += yearUnit;
      } else {
        secondTierYearUnits += yearUnit;
      }

      if (daysInThisYear === serviceYearDays) {
        completeYears += 1;
      } else {
        proratedYears = yearUnit;
      }

      remainingEligibleDays -= daysInThisYear;
      cursor = nextAnniversary;
      serviceYearIndex += 1;
    }

    return {
      grossServiceDays,
      unpaidAbsenceDays,
      eligibleServiceDays,
      completeYears,
      proratedYears,
      serviceYears: firstTierYearUnits + secondTierYearUnits,
      firstTierYearUnits,
      secondTierYearUnits,
      firstAnniversaryDays: daysBetweenExclusive(startDate, addCalendarYears(startDate, 1))
    };
  }

  function normalizeNonNegativeInteger(value) {
    if (value === undefined || value === null || value === "") {
      return 0;
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
      return null;
    }
    return number;
  }

  function normalizeLeavingReason(value) {
    return value === "terminated" ? "terminated" : "resigned";
  }

  function reviewRequired(reason, details) {
    return {
      status: REVIEW_REQUIRED,
      review_required: true,
      reason,
      details,
      estimated_gratuity_aed: null,
      disclaimer: "Manual review required. This calculator only estimates the general UAE private-sector full-time gratuity context outside alternative savings schemes."
    };
  }

  function calculateGratuity(input) {
    const monthlyBasicSalary = Number(input.monthly_basic_salary_aed ?? input.monthlyBasicSalary);
    const startDate = input.joining_date ? parseIsoDate(input.joining_date) : input.startDate;
    const endDate = input.last_working_date ? parseIsoDate(input.last_working_date) : input.endDate;
    const unpaidAbsenceDays = normalizeNonNegativeInteger(input.unpaid_absence_days ?? input.unpaidAbsenceDays);
    const employmentContext = input.employment_context || SUPPORTED_CONTEXT;
    const alternativeSavingsScheme = Boolean(input.alternative_savings_scheme);
    const leavingReason = normalizeLeavingReason(input.leaving_reason || input.leavingReason);
    const contextSupported = employmentContext === SUPPORTED_CONTEXT;

    if (
      !Number.isFinite(monthlyBasicSalary) ||
      monthlyBasicSalary <= 0 ||
      !startDate ||
      !endDate ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate ||
      unpaidAbsenceDays === null
    ) {
      return { error: "Invalid salary, date, or unpaid absence input." };
    }

    const grossServiceDays = daysBetweenInclusive(startDate, endDate);
    if (unpaidAbsenceDays > grossServiceDays) {
      return { error: "Unpaid absence days cannot exceed total service days." };
    }

    if (!contextSupported) {
      return reviewRequired("UNSUPPORTED_EMPLOYMENT_CONTEXT", "Only general UAE private-sector full-time employment is supported for an AED estimate.");
    }

    if (alternativeSavingsScheme) {
      return reviewRequired("ALTERNATIVE_SAVINGS_SCHEME", "Alternative end-of-service savings schemes require manual review.");
    }

    const service = calculateServiceBreakdown(startDate, endDate, unpaidAbsenceDays);
    const dailyBasicWage = monthlyBasicSalary / 30;
    const cap = monthlyBasicSalary * 24;
    const reasonNote = leavingReason === "terminated"
      ? "Ordinary employer termination uses the same general gratuity formula; misconduct dismissal, deductions, notice pay, and disputes need separate review."
      : "Resignation uses the same current general gratuity formula after one year of service; legacy resignation reductions are not applied.";
    const base = {
      status: "OK",
      eligible: service.eligibleServiceDays >= service.firstAnniversaryDays,
      service_years: service.serviceYears,
      complete_calendar_anniversary_years: service.completeYears,
      prorated_remaining_years: service.proratedYears,
      total_service_days: service.grossServiceDays,
      unpaid_absence_days: service.unpaidAbsenceDays,
      eligible_service_days: service.eligibleServiceDays,
      daily_basic_wage_aed: dailyBasicWage,
      cap_aed: cap,
      cap_applied: false,
      leaving_reason: leavingReason,
      leaving_reason_note: reasonNote,
      disclaimer: "Estimate only. Confirm special cases with MOHRE, HR, or a legal adviser."
    };

    if (!base.eligible) {
      return {
        ...base,
        first_five_years_gratuity_aed: 0,
        after_five_years_gratuity_aed: 0,
        estimated_gratuity_aed: 0
      };
    }

    const firstTier = service.firstTierYearUnits * 21 * dailyBasicWage;
    const secondTier = service.secondTierYearUnits * 30 * dailyBasicWage;
    const uncapped = firstTier + secondTier;

    return {
      ...base,
      first_five_years_gratuity_aed: firstTier,
      after_five_years_gratuity_aed: secondTier,
      cap_applied: uncapped > cap,
      estimated_gratuity_aed: Math.min(uncapped, cap)
    };
  }

  return {
    REVIEW_REQUIRED,
    SUPPORTED_CONTEXT,
    addCalendarYears,
    calculateGratuity,
    calculateServiceBreakdown,
    daysBetweenInclusive,
    exactCalendarAnniversaryYears,
    parseIsoDate,
    formatIsoDate
  };
});
