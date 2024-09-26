import moment from "moment-timezone";

export function convertToISTAndFormatISO(utcDate) {
  // Assuming utcDate is a Date object retrieved from MongoDB
  return moment.utc(utcDate).tz("Asia/Kolkata").toISOString();
}
