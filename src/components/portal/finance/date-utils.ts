export const MONTH_LABELS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

export function currentYear() {
    return Number(new Date().toISOString().slice(0, 4));
}

export function formatPeriodType(periodType: string) {
    if (periodType === "quarterly") {
        return "Quarterly";
    }
    if (periodType === "fiscal_year") {
        return "Fiscal Year";
    }
    return "Monthly";
}

export function formatPeriodLabel(periodType: string, period: string) {
    if (periodType === "fiscal_year") {
        return period.startsWith("FY-") ? period.replace("FY-", "FY ") : period;
    }
    if (periodType === "quarterly") {
        return period.replace("-", " ");
    }
    const [yearRaw, monthRaw] = period.split("-");
    const monthIndex = Number(monthRaw) - 1;
    if (!yearRaw || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return period;
    }
    return `${MONTH_LABELS[monthIndex]} ${yearRaw}`;
}
