import { exec } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { dirname } from "path";
import Document from "../models/document.js";
import { promisify } from "util";
import { ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execPromise = promisify(exec);

export const compare_documents = async (req, res, next) => {
  try {
    let document1 = await Document.findOne({
      _id: new ObjectId(req.body.document1),
    });
    let document2 = await Document.findOne({
      _id: new ObjectId(req.body.document2),
    });

    document1 = path.join(__dirname, document1.path);
    document2 = path.join(__dirname, document2.path);

    const pythonScriptPath = path.join(
      __dirname,
      "../../",
      "support",
      "compareDocument.py"
    );

    const pythonEnvPath = path.join(
      __dirname,
      "../../",
      "support",
      "venv",
      "bin",
      "python"
    );

    const command = `${pythonEnvPath} ${pythonScriptPath} "${document1}" "${document2}"`;

    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`Error output: ${stderr}`);
      throw new Error(stderr);
    }

    // Process the script output
    const observations = JSON.parse(stdout);

    return res.status(200).json({
      observations: observations,
    });
  } catch (error) {
    console.log("Error comparing documents", error);
    return res.status(500).json({
      message: "Error comparing documents",
    });
  }
};
