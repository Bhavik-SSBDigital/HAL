export function getMonthlyDateRanges(year = new Date().getFullYear()) {
  const today = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });
  const currentMonth = new Date(today).getMonth();
  const currentYear = new Date(today).getFullYear();

  const dateRanges = [];
  const startMonth = 0; // Start from January if it's the current year
  const endMonth = year === currentYear ? currentMonth : 11;

  for (let month = startMonth; month <= currentMonth; month++) {
    const startDate = new Date(year, month, 1); // Start of the month
    const endDate =
      month === currentMonth && year === currentYear
        ? new Date(today)
        : new Date(year, month + 1, 0); // End of the month
    endDate.setHours(23, 59, 59, 999); // Set time to end of the day
    startDate.setHours(0, 0, 0, 0); // Set time to midnight

    dateRanges.push({ startDate, endDate });
  }

  return dateRanges;
}

export function getDaysDifference(date1, date2) {
  // Convert both dates to milliseconds
  const date1Time = date1.getTime();
  const date2Time = date2.getTime();

  // Calculate the difference in milliseconds
  const timeDifference = Math.abs(date2Time - date1Time);

  // Convert the difference to days
  const differenceInDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

  return differenceInDays;
}
export function getFirstDateOfMonth(date) {
  const firstDateOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return firstDateOfMonth;
}

export function getYearDateRange(year) {
  const firstDate = new Date(year, 0, 1); // January 1st
  const lastDate = new Date(year, 11, 31); // December 31st

  return { firstDate, lastDate };
}
