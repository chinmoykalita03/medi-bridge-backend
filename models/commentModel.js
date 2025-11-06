// models/commentModel.js

import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // Polymorphic author reference, same as in Post
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "authorType",
    },
    authorType: {
      type: String,
      required: true,
      enum: ["User", "Doctor"],
    },
    // Reference to the parent post
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    // Reference to a parent comment (if this is a reply)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // Top-level comments will have this as null
    },
    // Nested replies
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;