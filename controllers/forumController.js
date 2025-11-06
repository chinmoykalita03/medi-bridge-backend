// controllers/forumController.js

import Post from "../models/postModel.js";
import Comment from "../models/commentModel.js";

/**
 * @desc    Helper function to capitalize user role
 * @param   {string} role - "user" or "doctor"
 * @returns {string} "User" or "Doctor"
 */
const capitalizeRole = (role) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * @desc    Define recursive population options for comments and replies
 */
const commentPopulation = {
  path: "replies",
  // Populate the author of the reply
  populate: [
    {
      path: "author",
      select: "name specialization", // Select only these fields
      // Use model: "User" or model: "Doctor" if 'role' isn't on the model
      // But since we have refPath, this should work.
    },
    // Recursively populate replies of replies
    // We add another 'replies' level to go deeper
    {
      path: "replies",
      populate: {
        path: "author",
        select: "name specialization",
      },
      // You can nest this as deep as you reasonably need
    },
  ],
};

/**
 * @desc    Get all posts with nested comments and replies
 * @route   GET /api/v1/forum/posts
 * @access  Protected
 */
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      // 1. Populate the main author of the Post
      .populate("author", "name specialization")
      // 2. Populate the top-level comments of the Post
      .populate({
        path: "comments",
        // 3. Populate the author of those top-level comments
        populate: [
          {
            path: "author",
            select: "name specialization",
          },
          // 4. Populate the replies for each top-level comment (using our recursive helper)
          commentPopulation,
        ],
        options: { sort: { createdAt: 1 } }, // Show oldest comments first
      });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
};

/**
 * @desc    Create a new post
 * @route   POST /api/v1/forum/posts
 * @access  Protected
 */
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const authorId = req.user.id;
    const authorType = capitalizeRole(req.user.role); // "User" or "Doctor"

    if (!content) {
      return res.status(400).json({ message: "Post content cannot be empty" });
    }

    const post = await Post.create({
      content,
      author: authorId,
      authorType: authorType,
    });

    // Send back the newly created post, populated with author info
    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "name specialization"
    );

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
};

/**
 * @desc    Create a new comment or reply
 * @route   POST /api/v1/forum/posts/:postId/comments
 * @access  Protected
 */
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body; // parentCommentId will be null/undefined for a top-level comment
    const authorId = req.user.id;
    const authorType = capitalizeRole(req.user.role);

    if (!content) {
      return res.status(400).json({ message: "Comment content cannot be empty" });
    }

    // 1. Create the new comment document
    const newComment = await Comment.create({
      content,
      author: authorId,
      authorType: authorType,
      post: postId,
      parentComment: parentCommentId || null,
    });

    // 2. Add the comment's ID to its parent (either the Post or another Comment)
    if (parentCommentId) {
      // It's a reply: add its ID to the parent comment's 'replies' array
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: newComment._id },
      });
    } else {
      // It's a top-level comment: add its ID to the Post's 'comments' array
      await Post.findByIdAndUpdate(postId, {
        $push: { comments: newComment._id },
      });
    }

    // 3. Send back the new comment, populated with its author
    const populatedComment = await Comment.findById(newComment._id).populate(
      "author",
      "name specialization"
    );

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment", error: error.message });
  }
};