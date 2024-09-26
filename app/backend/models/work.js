import mongoose from "mongoose";

const workSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const Work = mongoose.model("Work", workSchema);

export default Work;
