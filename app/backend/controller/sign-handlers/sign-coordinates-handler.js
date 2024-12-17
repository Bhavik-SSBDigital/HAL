import SignCoordinate from "../../models/signCoordinates.js";
import { verifyUser } from "../../utility/verifyUser.js";
export const add_sign_coordinates = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const docId = req.body.docId;
    const processId = req.body.processId;
    const coordinates = req.body.coordinates;

    const signCoordinates = await SignCoordinate.findOne({
      // processId: processId,
      docId: docId,
    });

    if (signCoordinates) {
      if (signCoordinates.coordinates.length > 0) {
        const existingCoordinates = signCoordinates.coordinates;

        signCoordinates.coordinates = [...coordinates, ...existingCoordinates];

        await signCoordinates.save();

        return res.status(200).json({
          message: "Updated coordinates successfuly",
        });
      }
    } else {
      const newCoordinate = new SignCoordinate({
        docId: docId,
        coordinates: coordinates,
      });

      await newCoordinate.save();

      return res.status(200).json({
        message: "Added coordinates successfuly",
      });
    }
  } catch (error) {
    console.log("Error adding/updating sign coordinates for the file", error);
    return res.status(500).json({
      message: "Error adding/updating sign coordinates for the file",
    });
  }
};

export const get_sign_coordinates_for_specific_step = async (
  req,
  res,
  next
) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const docId = req.body.docId;
    const processId = req.body.processId;
    const stepNo = req.body.stepNo;

    const coordinates = await get_sign_coordinates_for_specific_step_in_process(
      docId,
      // processId,
      stepNo
    );

    return res.status(200).json({
      coordinates: coordinates,
    });
  } catch (error) {
    console.log("Error finding coordinates for given context", error);
    return res.status(500).json({
      message: "Error finding coordinates for given context",
    });
  }
};

export const get_sign_coordinates_for_specific_step_in_process = async (
  docId,
  // processId,
  stepNo
) => {
  try {
    let coordinates = [];

    const signCoordinates = await SignCoordinate.findOne({
      // processId: processId,
      docId: docId,
    }).lean();

    if (signCoordinates) {
      if (signCoordinates.coordinates.length > 0) {
        coordinates = signCoordinates.coordinates.filter(
          (item) => item.stepNo === stepNo
        );
      }
    }

    return coordinates;
  } catch (error) {
    throw new Error(error);
  }
};
