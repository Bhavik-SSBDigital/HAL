import { verifyUser } from "../../utility/verifyUser.js";
import Process from "../../models/process.js";
import Document from "../../models/document.js";
import ProcessAnalytics from "../../models/analytics/process-analytics.js";
import { ObjectId } from "mongodb";
import { revertProcess } from "../processes-controller.js";
import mongoose from "mongoose";

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

export const get_process_details = async (pendingProcessDetails_) => {
  try {
    let pendingProcessDetails = await Promise.all(
      pendingProcessDetails_.map(async (item) => {
        console.log("item", item);
        let process = await Process.findOne({ _id: item }).select("name");
        return {
          name: process.name,
          processId: process._id,
        };
      })
    );

    return pendingProcessDetails;
  } catch (error) {
    return [];
    throw new Error(error);
  }
};

export const format_document_details = async (documentDetails) => {
  try {
    let formattedDocumentDetails = [];

    for (let i = 0; i < documentDetails.length; i++) {
      let documentsUploaded =
        documentDetails[i].documentsUploaded &&
        documentDetails[i].documentsUploaded.length > 0
          ? await get_document_details(documentDetails[i].documentsUploaded)
          : [];
      let documentsReverted =
        documentDetails[i].documentsReverted &&
        documentDetails[i].documentsReverted.length > 0
          ? await get_document_details(documentDetails[i].documentsReverted)
          : [];
      formattedDocumentDetails.push({
        workName: documentDetails[i].workName,
        documentsUploaded: documentsUploaded,
        documentsReverted: documentsReverted,
        documentCount: documentsUploaded.length,
        noOfRejectedDocuments: documentsReverted.length,
      });
    }

    return formattedDocumentDetails;
  } catch (error) {
    console.log("error formatting document details", error);
    throw new Error(error);
  }
};

export const get_document_details = async (docs) => {
  try {
    let finalDocs = await Promise.all(
      docs.map(async (item) => {
        let document = await Document.findOne({ _id: item }).select(
          "name path"
        );

        const parts = document.path.split("/"); // Split the path by "/"

        // Remove the last part (whether it’s a file name or folder name)
        parts.pop();

        const updatedPath = parts.join("/"); // Join the remaining parts back
        return {
          documentId: document._id,
          path: `..${updatedPath.substring(19)}`,
          name: document.name,
        };
      })
    );

    return finalDocs;
  } catch (error) {
    console.log("Error getting document details", error);
    throw new Error(error);
  }
};

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

      console.log("pending process details", pendingProcessDetails);
      console.log("rejected process details", revertedProcessDetails);

      let finalPendingProcessDetails = await get_process_details(
        pendingProcessDetails
      );

      let finalRevertedProcessDetails = await get_process_details(
        revertedProcessDetails
      );

      let finalFormattedDocumentDetails =
        documentDetails && documentDetails.length > 0
          ? await format_document_details(documentDetails)
          : [];

      processes_per_day.push({
        time: new Date(requiredDate),
        pendingProcessNumber: pendingProcessDetails.length,
        pendingProcesses: finalPendingProcessDetails,
        revertedProcessNumber: revertedProcessDetails.length,
        revertedProcesses: finalRevertedProcessDetails,
        completedProcessNumber: completedProcesses.length,
        documentDetails: finalFormattedDocumentDetails,
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
  try {
    let workNameCounts = {};

    // Loop through each item in workNameUnOrganized to accumulate data
    for (let i = 0; i < workNameUnOrganized.length; i++) {
      if (workNameUnOrganized[i].documentDetails) {
        workNameUnOrganized[i].documentDetails.forEach((item) => {
          if (workNameCounts[item.workName]) {
            // Handling reverted documents (previously documentsRejected)
            if (item.documentsReverted && item.documentsReverted.length) {
              workNameCounts[item.workName].documentsReverted = [
                ...item.documentsReverted,
                ...workNameCounts[item.workName].documentsReverted,
              ];
            } else {
              workNameCounts[item.workName].documentsReverted = [
                ...item.documentsReverted,
              ];
            }

            // Handling uploaded documents
            if (item.documentsUploaded) {
              workNameCounts[item.workName].documentsUploaded = [
                ...workNameCounts[item.workName].documentsUploaded,
                ...item.documentsUploaded,
              ];
            } else {
              workNameCounts[item.workName].documentsUploaded =
                item.documentsUploaded;
            }

            // Update document counts
            workNameCounts[item.workName].documentCount +=
              item.documentsUploaded ? item.documentsUploaded.length : 0;

            // Update number of rejected (reverted) documents
            workNameCounts[item.workName].noOfRejectedDocuments +=
              item.documentsReverted ? item.documentsReverted.length : 0;
          } else {
            // Initialize a new work name entry
            workNameCounts[item.workName] = {
              workName: item.workName,
              documentCount: item.documentsUploaded
                ? item.documentsUploaded.length
                : 0,
              documentsUploaded: item.documentsUploaded || [],
              documentsReverted: item.documentsReverted || [],
              noOfRejectedDocuments: item.documentsReverted
                ? item.documentsReverted.length
                : 0,
            };
          }
        });
      }
    }

    // Convert the workNameCounts object into an array with the desired format
    const documentDetails = Object.keys(workNameCounts).map((workName) => {
      const {
        documentsUploaded,
        documentsReverted,
        documentCount,
        noOfRejectedDocuments,
      } = workNameCounts[workName];
      return {
        workName,
        documentsUploaded: documentsUploaded.map((doc) => ({
          documentId: doc.documentId || doc._id,
          path: doc.path,
          name: doc.name,
        })),
        documentsReverted: documentsReverted.map((doc) => ({
          documentId: doc.documentId || doc._id,
          path: doc.path,
          name: doc.name,
        })),
        documentCount,
        noOfRejectedDocuments,
      };
    });

    return documentDetails;
  } catch (error) {
    console.log("Error in organizing document details", error);
    throw new Error(error);
  }
};

export const get_process_number_monthly = async (year, department) => {
  try {
    let processes_per_month = [];

    // Get the monthly date ranges as per your original function
    const dateRanges =
      year !== undefined ? getMonthlyDateRanges(year) : getMonthlyDateRanges();

    // Loop over each month's date range
    for (let i = 0; i < dateRanges.length; i++) {
      const startDate = dateRanges[i].startDate;
      const endDate = dateRanges[i].endDate;

      // Normalize the time for start and end of the month
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 0, 0);

      // Fetch ProcessAnalytics for the date range
      let pendingProcessNumbers = await ProcessAnalytics.find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      // Declare arrays for pending and reverted processes
      let pendingProcesses = [];
      let revertedProcesses = [];

      // If department is provided, filter data accordingly
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

      // Accumulate pending and reverted processes
      pendingProcessNumbers.forEach(
        (item) =>
          (pendingProcesses = [...pendingProcesses, ...item.pendingProcesses])
      );

      pendingProcessNumbers.forEach((item) => {
        if (item !== undefined) {
          revertedProcesses = [...revertedProcesses, ...item.revertedProcesses];
        }
      });

      // Get the accumulated work name count from the pending process numbers
      let workNameCounts = getAccumulatedWorkNameCount(pendingProcessNumbers);

      console.log("work name counts", workNameCounts);

      workNameCounts = await Promise.all(
        workNameCounts.map(async (item) => {
          let updatedWorkNameCounts = { ...item };

          updatedWorkNameCounts.documentsUploaded = await get_document_details(
            updatedWorkNameCounts.documentsUploaded.map(
              (item) => item.documentId
            )
          );

          updatedWorkNameCounts.documentsReverted = await get_document_details(
            updatedWorkNameCounts.documentsReverted.map(
              (item) => item.documentId
            )
          );

          return updatedWorkNameCounts;
        })
      );

      // Fetch completed processes for the given department
      const completedProcesses =
        department !== undefined
          ? await Process.find({
              workFlow: department,
              completedAt: { $gte: startDate, $lte: endDate },
            }).select("_id name")
          : await Process.find({
              completedAt: { $gte: startDate, $lte: endDate },
            }).select("_id name");

      // Push the formatted data to the results array
      processes_per_month.push({
        time: monthNames[startDate.getMonth()], // Use the month name
        pendingProcessNumber: pendingProcesses.length,
        pendingProcesses: await get_process_details(pendingProcesses),
        revertedProcessNumber: revertedProcesses.length,
        revertedProcesses: await get_process_details(revertedProcesses),
        completedProcessNumber: completedProcesses.length,
        completedProcesses: completedProcesses,
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

    // Loop through each year (last 7 years including current year)
    for (let i = 0; i < 7; i++) {
      const allMonthNumbers = await get_process_number_monthly(
        currentYear - i,
        department
      );

      // Initialize counters for yearly values
      let pendingProcessNumber = 0;
      let revertedProcessNumber = 0;
      let completedProcessNumber = 0;

      // Initialize a map to accumulate the document details per workName for the year
      let accumulatedDocumentDetails = {};

      // Loop over the monthly data to accumulate values for the year
      allMonthNumbers.forEach((monthData) => {
        pendingProcessNumber += monthData.pendingProcessNumber;
        revertedProcessNumber += monthData.revertedProcessNumber;
        completedProcessNumber += monthData.completedProcessNumber;

        // For each month's document details, we need to accumulate by workName
        if (monthData.documentDetails && monthData.documentDetails.length > 0) {
          monthData.documentDetails.forEach((docDetail) => {
            const workName = docDetail.workName;

            // If this workName has been seen before, we accumulate its details
            if (!accumulatedDocumentDetails[workName]) {
              accumulatedDocumentDetails[workName] = {
                documentsUploaded: [],
                documentsReverted: [],
                documentCount: 0,
                noOfRejectedDocuments: 0,
              };
            }

            // Accumulate the documents for this workName
            accumulatedDocumentDetails[workName].documentsUploaded.push(
              ...docDetail.documentsUploaded
            );
            accumulatedDocumentDetails[workName].documentsReverted.push(
              ...docDetail.documentsReverted
            );
            accumulatedDocumentDetails[workName].documentCount +=
              docDetail.documentCount;
            accumulatedDocumentDetails[workName].noOfRejectedDocuments +=
              docDetail.noOfRejectedDocuments;
          });
        }
      });

      // Prepare the accumulated document details array from the map
      const accumulatedDetailsArray = Object.keys(
        accumulatedDocumentDetails
      ).map((workName) => ({
        workName,
        ...accumulatedDocumentDetails[workName],
      }));

      // Push the accumulated yearly data for this year into the result
      dateRangesYearly.push({
        time: currentYear - i, // This is the year we're currently processing
        pendingProcessNumber: pendingProcessNumber,
        revertedProcessNumber: revertedProcessNumber,
        completedProcessNumber: completedProcessNumber,
        documentDetails: accumulatedDetailsArray, // Contains the accumulated document details per year
      });
    }

    return dateRangesYearly;
  } catch (error) {
    console.log("error", error);
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
    let processes_per_day = [];

    // Normalize start and end date
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch pending process numbers
    let pendingProcesses = await ProcessAnalytics.find({
      date: { $gte: startDate, $lte: endDate },
    });

    // Handle department filtering if department is provided
    if (department !== undefined) {
      pendingProcesses = pendingProcesses.map((item) => {
        const departmentProcessData = item.departmentsPendingProcess.find((d) =>
          d.department.equals(new ObjectId(department))
        );
        return departmentProcessData || item;
      });
    }

    let revertedProcesses = [];
    let pendingProcessNumbers = [];

    // Accumulate pending and reverted processes
    pendingProcesses.forEach((item) => {
      if (item) {
        revertedProcesses.push(...item.revertedProcesses);
        pendingProcessNumbers.push(...item.pendingProcesses);
      }
    });

    // Fetch detailed process information for pending and reverted processes
    const detailedPendingProcesses = await get_process_details(
      pendingProcessNumbers
    );
    const detailedRevertedProcesses = await get_process_details(
      revertedProcesses
    );

    // Fetch completed processes within the date range
    const completedProcesses =
      department !== undefined
        ? await Process.find({
            workFlow: department,
            completedAt: { $gte: startDate, $lte: endDate },
          }).select("_id name")
        : await Process.find({
            completedAt: { $gte: startDate, $lte: endDate },
          }).select("_id name");

    // Get document details
    let workNameCounts = getAccumulatedWorkNameCount(pendingProcesses);

    // Format document details for each work name
    workNameCounts = await Promise.all(
      workNameCounts.map(async (item) => {
        let updatedItem = { ...item };
        updatedItem.documentsUploaded = await get_document_details(
          updatedItem.documentsUploaded.map((doc) => doc.documentId)
        );
        updatedItem.documentsReverted = await get_document_details(
          updatedItem.documentsReverted.map((doc) => doc.documentId)
        );
        return updatedItem;
      })
    );

    // Return results
    return {
      time: `${startDate.getDate()}-${
        monthNames[startDate.getMonth()]
      }-${startDate.getFullYear()}`,
      pendingProcessNumber: detailedPendingProcesses.length,
      pendingProcesses: detailedPendingProcesses,
      revertedProcessNumber: detailedRevertedProcesses.length,
      revertedProcesses: detailedRevertedProcesses,
      completedProcessNumber: completedProcesses.length,
      completedProcesses: completedProcesses,
      documentDetails: workNameCounts,
    };
  } catch (error) {
    console.error(
      "Error in getProcessPendingCompletedNumberForSpecificDateRange:",
      error
    );
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
      // For date ranges of up to 31 days, process daily counts
      let processes_per_day = [];

      for (let i = 0; i <= dayDifference; i++) {
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const pendingProcesses = await ProcessAnalytics.findOne({
          date: currentDate,
        });

        // Handle department-specific logic for pending processes
        let documentDetails = [];
        let pendingProcessDetails = [];
        let revertedProcessDetails = [];

        if (pendingProcesses) {
          const departmentProcess =
            department === undefined
              ? pendingProcesses
              : pendingProcesses.departmentsPendingProcess.find((item) =>
                  item.department.equals(new ObjectId(department))
                );

          if (departmentProcess) {
            documentDetails = departmentProcess.documentDetails || [];
            pendingProcessDetails = departmentProcess.pendingProcesses || [];
            revertedProcessDetails = departmentProcess.revertedProcesses || [];
          }
        }

        // Fetch detailed pending and reverted process information
        const detailedPendingProcesses = await get_process_details(
          pendingProcessDetails
        );
        const detailedRevertedProcesses = await get_process_details(
          revertedProcessDetails
        );

        // Fetch completed processes for the day
        const completedProcesses =
          department !== undefined
            ? await Process.find({
                workFlow: department,
                completedAt: { $gte: currentDate, $lte: dayEnd },
              }).select("_id name")
            : await Process.find({
                completedAt: { $gte: currentDate, $lte: dayEnd },
              }).select("_id name");

        processes_per_day.push({
          time: `${currentDate.getDate()}-${
            monthNames[currentDate.getMonth()]
          }-${currentDate.getFullYear()}`,
          pendingProcessNumber: detailedPendingProcesses.length,
          pendingProcesses: detailedPendingProcesses,
          revertedProcessNumber: detailedRevertedProcesses.length,
          revertedProcesses: detailedRevertedProcesses,
          completedProcessNumber: completedProcesses.length,
          completedProcesses: completedProcesses,
          documentDetails: await format_document_details(documentDetails),
        });
      }

      return processes_per_day;
    } else if (dayDifference > 31 && dayDifference <= 366) {
      // For date ranges over a month, fetch monthly data
      return await get_process_number_monthly(
        startDate.getFullYear(),
        department
      );
    } else if (dayDifference > 366) {
      // For date ranges over a year, fetch yearly data
      return await get_process_number_yearly(department);
    }
  } catch (error) {
    console.error("Error in get_process_number_for_custom_range:", error);
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

export const get_process_statistics = async (req, res, next) => {
  try {
    let filter = {};

    let departmentId = req.body.departmentId;

    // If departmentId is provided, filter by workFlow
    if (departmentId) {
      filter.workFlow = mongoose.Types.ObjectId(departmentId);
    }

    // Get all processes based on the filter
    const processes = await Process.find(filter);

    // Initialize counters
    let totalTAT = 0;
    let completedProcesses = 0;
    let pendingProcesses = 0;
    let docsUploaded = 0;
    let rejectedDocsCount = 0;

    processes.forEach((process) => {
      // Calculate TAT and process completion
      if (process.completed) {
        completedProcesses++;
        if (process.completedAt && process.createdAt) {
          totalTAT +=
            new Date(process.completedAt) - new Date(process.createdAt);
        }
      } else {
        pendingProcesses++;
      }

      // Count documents in process.documents and connectors for both completed and pending processes
      const processDocuments = [
        ...process.documents,
        ...process.connectors.flatMap((connector) => connector.documents),
      ];

      processDocuments.forEach((doc) => {
        docsUploaded++; // Every document counts as uploaded
        if (doc.rejection && doc.rejection.reason) {
          rejectedDocsCount++; // If rejection exists, count as rejected
        }
      });
    });

    // Convert total TAT to hours (1 hour = 3,600,000 milliseconds)
    const averageTATInHours =
      completedProcesses > 0
        ? totalTAT / completedProcesses / (1000 * 60 * 60)
        : 0;

    // Round the average TAT to 3 decimal places
    const roundedAverageTAT = parseFloat(averageTATInHours.toFixed(3));

    // Calculate rejection percentage
    let rejectionPercentage =
      docsUploaded > 0 ? (rejectedDocsCount / docsUploaded) * 100 : 0;

    rejectionPercentage = Math.round(rejectionPercentage * 2) / 2;

    return res.status(200).json({
      average_TAT_to_complete_the_process: `${roundedAverageTAT} Hours`, // in hours with 3 decimal places
      total_pending_processes: pendingProcesses,
      docsUploaded: docsUploaded, // total uploaded documents for all processes (completed and pending)
      rejectionPercentage: rejectionPercentage, // percentage of rejected documents
    });
  } catch (error) {
    console.log("Error returning process statistics", error);
    res.status(500).json({
      message: "Error returning process statistics",
    });
  }
};
