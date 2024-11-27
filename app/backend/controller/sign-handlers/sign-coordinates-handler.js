import SignCoordinate from "../../models/signCoorditaes.js";
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
      processId: processId,
      docId: docId,
    });

    if (signCoordinates) {
      if (signCoordinates.coordinates.length > 0) {
        const coordinates = signCoordinates.coordinates;

        signCoordinates.coordinates = [...signCoordinates, ...coordinates];

        await signCoordinates.save();

        return res.status(200).json({
          message: "Updated coordinates successfuly",
        });
      }
    } else {
      const newCoordinate = new SignCoordinate(req.body);

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
