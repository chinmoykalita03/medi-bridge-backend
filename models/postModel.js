// models/postModel.js

import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // Polymorphic author reference
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "authorType", // Tells Mongoose to look at the 'authorType' field
    },
    authorType: {
      type: String,
      required: true,
      enum: ["User", "Doctor"], // The two models that can be authors
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;