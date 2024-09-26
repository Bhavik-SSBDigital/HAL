import Document from "../models/document.js";
import { verifyUser } from "../utility/verifyUser.js";
import Highlight from "../models/highlight.js";
import User from "../models/user.js";
import { ObjectId } from "mongodb";

export const post_highlight_in_file = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { remark, coordinates, documentId } = req.body;
    const createdBy = userData._id;
    const document = await Document.findById(documentId);
    let highlight = new Highlight({ coordinates, remark, createdBy });
    highlight = await highlight.save();
    if (!document.highlights || document.highlights.length === 0) {
      // If highlights is undefined or an empty array, initialize it with the new highlight
      document.highlights = [highlight._id];
    } else {
      // If highlights already exist, push the new highlight into the array
      document.highlights.push(highlight._id);
    }
    await document.save();
    return res.status(200).json({
      message: "Highlight added successfully",
    });
  } catch (error) {
    console.log("error while marking highlights in file", error);
    return res.status(500).json({
      message: "error while adding highlight in file",
    });
  }
};

export const get_highlights_in_file = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const document = await Document.findById(req.params.id);

    let highlights = document.highlights;

    highlights = await Promise.all(
      highlights.map(async (item) => {
        let highlight = await Highlight.findOne({
          _id: new ObjectId(item),
        }).lean();

        const username = await User.findOne({
          _id: highlight.createdBy,
        }).select("username");
        return {
          ...highlight,
          createdBy: username.username,
        };
      })
    );

    return res.status(200).json({
      highlights: highlights,
    });
  } catch (error) {
    console.log("Failed to retrieve highlights", error);
    return res.status(500).json({ error: "Failed to retrieve highlights" });
  }
};
