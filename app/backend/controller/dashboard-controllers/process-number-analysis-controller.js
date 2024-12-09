import { verifyUser } from "../../utility/verifyUser.js";
import Process from "../../models/process.js";
import ProcessAnalytics from "../../models/analytics/process-analytics.js";
import { ObjectId } from "mongodb";

const monthNames = [
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

export const get_process_number_weekly = async (department) => {
  try {
    let processes_per_day = [];

    for (let i = 0; i < 7; i++) {
      let currentDate = new Date();
      let requiredDate = new Date();
      requiredDate.setDate(currentDate.getDate() - i);
      requiredDate.setHours(0, 0, 0, 0);

      let endOfRequiredDate = new Date(); // Creates a new Date object
      endOfRequiredDate.setDate(currentDate.getDate() - i);
      endOfRequiredDate.setHours(23, 59, 0, 0);

      const pendingProcesses = await ProcessAnalytics.findOne({
        date: requiredDate,
      });

      let documentDetails = [];

      // if (pendingProcesses !== null) {
      //   documentDetails =
      //     department === undefined
      //       ? pendingProcesses.documentDetails
      //       : pendingProcesses.departmentsPendingProcess.find((item) =>
      //           item.department.equals(new ObjectId(department))
      //         ) === undefined
      //       ? []
      //       : pendingProcesses.departmentsPendingProcess.find((item) =>
      //           item.department.equals(new ObjectId(department))
      //         ).documentDetails;

      //   if (documentDetails === null) {
      //     documentDetails = [];
      //   }
      // }

      if (pendingProcesses !== null) {
        documentDetails =
          department === undefined
            ? pendingProcesses.documentDetails
            : pendingProcesses.departmentsPendingProcess.find(
                (item) =>
                  item &&
                  item.department &&
                  item.department.equals(new ObjectId(department))
              ) === undefined
            ? []
            : pendingProcesses.departmentsPendingProcess.find(
                (item) =>
                  item &&
                  item.department &&
                  item.department.equals(new ObjectId(department))
              ).documentDetails;

        if (documentDetails === null) {
          documentDetails = [];
        }
      }

      const completedProcesses =
        department !== undefined
          ? await Process.find({
              // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
              workFlow: department,
              completedAt: { $lte: endOfRequiredDate, $gte: requiredDate }, // completedAt > requiredDate
            }).select("_id")
          : await Process.find({
              // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
              completedAt: { $lte: endOfRequiredDate, $gte: requiredDate }, // completedAt > requiredDate
            }).select("_id");

      let pendingProcessDetails;
      let revertedProcessDetails;

      if (pendingProcesses) {
        let wantedProcessNumberData;

        if (department !== undefined) {
          wantedProcessNumberData =
            pendingProcesses.departmentsPendingProcess.find(
              (item) =>
                item &&
                item.department &&
                item.department.equals(new ObjectId(department))
            );
        }

        pendingProcessDetails =
          department === undefined
            ? pendingProcesses.pendingProcesses
            : wantedProcessNumberData === undefined
            ? 0
            : wantedProcessNumberData.pendingProcesses;

        revertedProcessDetails =
          department === undefined
            ? pendingProcesses.revertedProcesses
            : wantedProcessNumberData === undefined
            ? 0
            : wantedProcessNumberData.revertedProcesses;
      } else {
        pendingProcessDetails = [];
        revertedProcessDetails = [];
      }
      processes_per_day.push({
        time: new Date(requiredDate),
        pendingProcessNumber: pendingProcessDetails.length,
        revertedProcessNumber: revertedProcessDetails.length,
        completedProcessNumber: completedProcesses.length,
        documentDetails: documentDetails,
      });
    }

    return processes_per_day;
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

function getMonthlyDateRanges(year_ = new Date().getFullYear()) {
  const year = parseInt(year_);
  const today = new Date();
  const currentMonth = new Date(today).getMonth();
  const currentYear = new Date(today).getFullYear();

  const dateRanges = [];
  const startMonth = 0; // Start from January if it's the current year
  const endMonth = year === currentYear ? currentMonth : 11;

  for (let month = startMonth; month <= endMonth; month++) {
    const startDate = new Date(year, month, 1); // Start of the month

    let endDate;

    if (month === currentMonth && year === currentYear) {
      endDate = new Date(); // Set to current date
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // Set to start of next month and subtract 1 millisecond
      endDate = new Date(year, month, 1);
      endDate.setMilliseconds(endDate.getMilliseconds());
    }

    endDate.setHours(23, 59, 59, 999); // Set time to end of the day
    startDate.setHours(0, 0, 0, 0); // Set time to midnight

    dateRanges.push({ startDate, endDate });
  }

  return dateRanges;
}

const getAccumulatedWorkNameCount = (workNameUnOrganized) => {
  let workNameCounts = {};

  let documentDetails = [];

  for (let i = 0; i < workNameUnOrganized.length; i++) {
    if (workNameUnOrganized[i].documentDetails) {
      workNameUnOrganized[i].documentDetails.forEach((item) => {
        if (workNameCounts[item.workName]) {
          if (workNameCounts[item.workName].noOfRejectedDocuments) {
            workNameCounts[item.workName].noOfRejectedDocuments +=
              item.noOfRejectedDocuments;
          } else {
            workNameCounts[item.workName].noOfRejectedDocuments =
              item.noOfRejectedDocuments;
          }
          if (workNameCounts[item.workName].documentCount) {
            workNameCounts[item.workName].documentCount += item.documentCount;
          } else {
            workNameCounts[item.workName].documentCount = item.documentCount;
          }
          // workNameCounts[item.workName] =
          //   workNameCounts[item.workName] + item.documentCount;
        } else {
          workNameCounts[item.workName] = {
            documentCount: item.documentCount,
            noOfRejectedDocuments: item.noOfRejectedDocuments,
          };
        }
      });
    }
  }

  workNameCounts = Object.entries(workNameCounts).map(([workName, count]) => {
    return {
      workName: workName,
      documentCount: count.documentCount,
      noOfRejectedDocuments: count.noOfRejectedDocuments,
    };
  });

  return workNameCounts;
};

export const get_process_number_monthly = async (year, department) => {
  try {
    let processes_per_month = [];
    const dateRanges =
      year !== undefined ? getMonthlyDateRanges(year) : getMonthlyDateRanges();

    for (let i = 0; i < dateRanges.length; i++) {
      const startDate = dateRanges[i].startDate;
      const endDate = dateRanges[i].endDate;

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      let pendingProcessNumbers = await ProcessAnalytics.find({
        date: {
          $lte: endDate,
          $gte: startDate,
        },
      });

      if (department !== undefined) {
        pendingProcessNumbers = pendingProcessNumbers.map((item) => {
          let item_ = item;

          const wantedProcessNumberData = item_.departmentsPendingProcess.find(
            (item) => item.department.equals(new ObjectId(department))
          );

          if (wantedProcessNumberData !== undefined) {
            return wantedProcessNumberData;
          }
        });
      }

      let pendingProcessesNumbers_ = pendingProcessNumbers.map((item) =>
        item !== undefined ? item.noOfPendingProcess : 0
      );

      const pedingProcessCount = pendingProcessesNumbers_.reduce(
        (acc, value) => acc + value,
        0
      );

      let revertedProcessNumbers_ = pendingProcessNumbers.map((item) => {
        if (item !== undefined) {
          return item.noOfRevertedProcess;
        } else {
          return 0;
        }
      });

      const revertedProcessCount = revertedProcessNumbers_.reduce(
        (acc, value) => acc + value,
        0
      );

      let workNameCounts = getAccumulatedWorkNameCount(pendingProcessNumbers);

      const completedProcesses =
        department !== undefined
          ? await Process.find({
              // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
              workFlow: department,
              completedAt: { $lte: endDate, $gte: startDate }, // completedAt > requiredDate
            }).select("_id")
          : await Process.find({
              // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
              completedAt: { $lte: endDate, $gte: startDate }, // completedAt > requiredDate
            }).select("_id");

      processes_per_month.push({
        time: monthNames[startDate.getMonth()],
        pendingProcessNumber: pedingProcessCount,
        revertedProcessNumber: revertedProcessCount,
        completedProcessNumber: completedProcesses.length,
        documentDetails: workNameCounts,
      });
    }

    return processes_per_month;
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

const get_process_number_yearly = async (department) => {
  try {
    const dateRangesYearly = [];

    const currentDate = new Date();

    const currentYear = currentDate.getFullYear();

    for (let i = 0; i < 7; i++) {
      let allMonthNumbers = await get_process_number_monthly(
        currentYear - i,
        department
      );
      let pendingProcessNumber = allMonthNumbers.map(
        (item) => item.pendingProcessNumber
      );
      pendingProcessNumber = pendingProcessNumber.reduce(
        (acc, value) => acc + value,
        0
      );

      let revertedProcessNumber = allMonthNumbers.map(
        (item) => item.revertedProcessNumber
      );

      revertedProcessNumber = revertedProcessNumber.reduce(
        (acc, value) => acc + value,
        0
      );

      let completedProcessNumber = allMonthNumbers.map(
        (item) => item.completedProcessNumber
      );
      completedProcessNumber = completedProcessNumber.reduce(
        (acc, value) => acc + value,
        0
      );

      let workNameCounts = getAccumulatedWorkNameCount(allMonthNumbers);

      dateRangesYearly.push({
        time: currentYear - i,
        pendingProcessNumber: pendingProcessNumber,
        revertedProcessNumber: revertedProcessNumber,
        completedProcessNumber: completedProcessNumber,
        documentDetails: workNameCounts,
      });
    }

    return dateRangesYearly;
  } catch (error) {
    throw new Error(error);
  }
};

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
function getFirstDateOfMonth(date) {
  const firstDateOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return firstDateOfMonth;
}

function getYearDateRange(year) {
  const firstDate = new Date(year, 0, 1); // January 1st
  const lastDate = new Date(year, 11, 31); // December 31st

  return { firstDate, lastDate };
}

// // Example usage:
// const year = 2023; // Replace with the desired year
// const { firstDate, lastDate } = getYearDateRange(year);

// console.log(`First date of ${year}:`, firstDate.toDateString());
// console.log(`Last date of ${year}:`, lastDate.toDateString());

const getProcessPendingCompletedNumberForSpecificDateRange = async (
  startDate,
  endDate,
  department
) => {
  try {
    let workNameCounts = [];
    let pendingProcessNumber = await ProcessAnalytics.find({
      date: {
        $lte: endDate,
        $gte: startDate,
      },
    });

    let revertedProcessNumber;
    const completedProcessNumber =
      department !== undefined
        ? await Process.find({
            workFlow: department,
            completedAt: {
              $lte: endDate,
              $gte: startDate,
            },
            completed: true,
          }).select("_id")
        : await Process.find({
            completedAt: {
              $lte: endDate,
              $gte: startDate,
            },
            completed: true,
          }).select("_id");

    if (pendingProcessNumber !== null) {
      if (department !== undefined) {
        pendingProcessNumber = pendingProcessNumber.map((item) => {
          let item_ = item;
          const wantedProcessNumberData = item_.departmentsPendingProcess.find(
            (item) => item.department.equals(new ObjectId(department))
          );
          if (wantedProcessNumberData !== undefined) {
            return wantedProcessNumberData;
          }
        });
      }

      revertedProcessNumber = pendingProcessNumber.map((item) =>
        item !== undefined ? item.noOfRevertedProcess : 0
      );

      revertedProcessNumber = revertedProcessNumber.reduce(
        (acc, value) => acc + value,
        0
      );

      workNameCounts = getAccumulatedWorkNameCount(pendingProcessNumber);

      let pendingProcessNumber_ = pendingProcessNumber.map((item) =>
        item !== undefined ? item.noOfPendingProcess : 0
      );
      pendingProcessNumber = pendingProcessNumber_.reduce(
        (acc, value) => acc + value,
        0
      );
    }

    return {
      time: `${startDate.getDate()}-${endDate.getDate()} ${
        monthNames[endDate.getMonth()]
      }`,
      pendingProcessNumber:
        pendingProcessNumber === null ? 0 : pendingProcessNumber,
      revertedProcessNumber:
        pendingProcessNumber === null ? 0 : revertedProcessNumber,
      completedProcessNumber: completedProcessNumber.length,
      documentDetails: workNameCounts,
    };
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

const get_process_number_for_custom_range = async (
  startDate_,
  endDate_,
  department
) => {
  try {
    let startDate = new Date(startDate_);
    let endDate = new Date(endDate_);

    const dayDifference = getDaysDifference(startDate, endDate);

    if (dayDifference <= 31) {
      let processes_per_day = [];
      for (let i = 0; i <= dayDifference; i++) {
        let requiredDate = new Date();
        requiredDate.setDate(startDate.getDate() + i);

        requiredDate.setHours(0, 0, 0, 0);
        let endOfRequiredDate = new Date();
        endOfRequiredDate.setDate(startDate.getDate() + i);
        //   endOfRequiredDate = endOfRequiredDate.setDate(requiredDate.getDate() - 1);
        endOfRequiredDate.setHours(23, 59, 0, 0);

        let pendingProcesses = await ProcessAnalytics.findOne({
          date: requiredDate,
        });

        if (pendingProcesses !== null) {
          if (department !== undefined) {
            const wantedProcessNumberData =
              pendingProcesses.departmentsPendingProcess.find((item) =>
                item.department.equals(new ObjectId(department))
              );
            if (wantedProcessNumberData !== undefined) {
              pendingProcesses = wantedProcessNumberData;
            } else {
              pendingProcesses = null;
            }
          }
        }

        const completedProcesses =
          department !== undefined
            ? await Process.find({
                // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
                workFlow: department,
                completedAt: { $lte: endOfRequiredDate, $gte: requiredDate }, // completedAt > requiredDate
              }).select("_id")
            : await Process.find({
                // createdAt: { $lte: requiredDate }, // startedAt < requiredDate
                completedAt: { $lte: endOfRequiredDate, $gte: requiredDate }, // completedAt > requiredDate
              }).select("_id");

        processes_per_day.push({
          time: new Date(requiredDate),
          pendingProcessNumber:
            pendingProcesses !== null ? pendingProcesses.noOfPendingProcess : 0,
          revertedProcessNumber:
            pendingProcesses !== null
              ? pendingProcesses.noOfRevertedProcess
              : 0,
          documentDetails:
            pendingProcesses !== null ? pendingProcesses.documentDetails : [],
          completedProcessNumber: completedProcesses.length,
        });
      }

      return processes_per_day;
    } else if (dayDifference > 31 && dayDifference <= 366) {
      let processNumberMonthlyWithYear = [];
      let processNumberMonthlyForStartDateYear =
        await get_process_number_monthly(startDate.getFullYear(), department);

      processNumberMonthlyForStartDateYear =
        processNumberMonthlyForStartDateYear.map((item) => {
          let item_ = item;
          const time_with_month_year = `${
            item_.time
          }-${startDate.getFullYear()}`;
          item_["time"] = time_with_month_year;
          return item_;
        });

      let processNumberMonthlyForEndDateYear;
      if (startDate.getFullYear() === endDate.getFullYear()) {
        processNumberMonthlyWithYear =
          processNumberMonthlyForStartDateYear.slice(
            startDate.getMonth() + 1,
            endDate.getMonth()
          );
        // processNumberMonthlyWithYear = processNumberMonthlyWithYear.map(
        //   (item) => {
        //     let item_ = item;
        //     console.log("item_", item_);
        //     const time_with_month_year = `${
        //       item_.time
        //     }-${startDate.getFullYear()}`;
        //     item_["time"] = time_with_month_year;
        //     return item_;
        //   }
        // );
      } else {
        processNumberMonthlyForEndDateYear = await get_process_number_monthly(
          endDate.getFullYear(),
          department
        );
        if (endDate.getMonth() !== 0) {
          processNumberMonthlyForEndDateYear =
            processNumberMonthlyForEndDateYear.slice(0, endDate.getMonth());
        } else {
          processNumberMonthlyForEndDateYear = [];
        }

        processNumberMonthlyForStartDateYear =
          processNumberMonthlyForStartDateYear.slice(
            startDate.getMonth() + 1,
            12
          );
        processNumberMonthlyForEndDateYear =
          processNumberMonthlyForEndDateYear.map((item) => {
            let item_ = item;
            const time_with_month_year = `${
              item_.time
            }-${startDate.getFullYear()}`;
            item_["time"] = time_with_month_year;
            return item_;
          });
        processNumberMonthlyWithYear =
          processNumberMonthlyForStartDateYear.concat(
            processNumberMonthlyForEndDateYear
          );
      }

      let endDateOfStartingMonth = new Date();

      endDateOfStartingMonth.setMonth(startDate.getMonth() + 1);

      endDateOfStartingMonth.setDate(0);

      const processDataForFirstMonthsDays =
        await getProcessPendingCompletedNumberForSpecificDateRange(
          startDate,
          endDateOfStartingMonth,
          department
        );

      processNumberMonthlyWithYear.unshift(processDataForFirstMonthsDays);

      const lastMonthFirstDate = getFirstDateOfMonth(endDate);

      // let pendingProcessNumber = await ProcessAnalytics.find({
      //   date: {
      //     $lte: endDate,
      //     $gte: lastMonthFirstDate,
      //   },
      // });

      // if (department !== undefined) {
      //   pendingProcessNumber = pendingProcessNumber.map((item) => {
      //     let item_ = item;
      //     const wantedProcessNumberData = item_.departmentsPendingProcess.find(
      //       (item) => item.department === department
      //     );
      //     if (wantedProcessNumberData !== undefined) {
      //       return wantedProcessNumberData;
      //     }
      //   });
      // }

      // let pendingProcessNumber_ = pendingProcessNumber.map((item) =>
      //   item !== undefined ? item.noOfPendingProcess : 0
      // );
      // pendingProcessNumber = pendingProcessNumber_.reduce(
      //   (acc, value) => acc + value,
      //   0
      // );

      // const completedProcessNumber =
      //   department !== undefined
      //     ? await Process.find({
      //         workFlow: department,
      //         completedAt: {
      //           $lte: lastMonthFirstDate,
      //           $gte: endDate,
      //         },
      //         completed: true,
      //       }).select("_id")
      //     : await Process.find({
      //         completedAt: {
      //           $lte: lastMonthFirstDate,
      //           $gte: endDate,
      //         },
      //         completed: true,
      //       }).select("_id");

      // let completedProcessesNumber = completedProcessNumber.length;

      // console.log("completed process number brooo", completedProcessNumber);

      const processDataForLastMonthsDays =
        await getProcessPendingCompletedNumberForSpecificDateRange(
          lastMonthFirstDate,
          endDate,
          department
        );

      processNumberMonthlyWithYear.push(processDataForLastMonthsDays);

      return processNumberMonthlyWithYear;
    } else if (dayDifference > 366) {
      // const startYear = startDate.getFullYear();
      // const endYear = endDate.getFullYear();
      // let processNumberYearly = [];
      // for(let year= startYear; year<= endYear; year++){
      //     const dateRange = getYearDateRange(year);
      //     const startDate = dateRange.firstDate;
      //     const endDate = dateRange.lastDate;
      //     let totalProcessNumbersForCurrentYear = await get_process_number_monthly(year);
      //     totalProcessNumbersForCurrentYear = totalProcessNumbersForCurrentYear.map(item => )
      // }
    }
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

export const get_process_number = async (req, res, next) => {
  try {
    // const accessToken = req.headers["authorization"].substring(7);
    // const userData = await verifyUser(accessToken);
    // if (userData === "Unauthorized") {
    //   return res.status(401).json({
    //     message: "Unauthorized request",
    //   });
    // }

    const data = req.body;

    let processNumberWithDuration = [];

    if (data.duration === "weekly") {
      processNumberWithDuration = await get_process_number_weekly(
        req.body.department
      );
    } else if (data.duration === "monthly") {
      processNumberWithDuration =
        req.body.year !== undefined
          ? await get_process_number_monthly(req.body.year, req.body.department)
          : await get_process_number_monthly(undefined, req.body.department);
    } else if (data.duration === "yearly") {
      processNumberWithDuration = await get_process_number_yearly(
        req.body.department
      );
    } else if (data.duration === "custom") {
      processNumberWithDuration = await get_process_number_for_custom_range(
        data.customDuration.startDate,
        data.customDuration.endDate,
        req.body.department
      );
    }

    return res.status(200).json({
      processNumberWithDuration: processNumberWithDuration,
    });
  } catch (error) {
    console.log("error getting pending & completed process number", error);
    return res.status(500).json({
      message: "error getting pending & completed process number",
    });
  }
};
