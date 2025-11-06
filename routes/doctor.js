import express from "express";
import jwt from "jsonwebtoken";
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import Appointment from "../models/Appointment.js";
import { markAppointmentCompleted } from "../controllers/doctorController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  setAvailability,
  getDoctorAppointments,
  updateAppointmentStatus,
  getDoctorsBySpecialization,
  getDoctorSlots, // ✅ Added this import
} from "../controllers/doctorController.js";

const router = express.Router();

// ✅ Middleware to verify doctor token
const verifyDoctorToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.doctorId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// 🩺 Doctor Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, specialization } = req.body;

    // 1️⃣ Validate input
    if (!name || !email || !password || !specialization) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 3️⃣ Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create new doctor
    const doctor = await Doctor.create({
      name,
      email,
      password: hashedPassword,
      specialization,
    });

    // 5️⃣ Generate JWT token
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 6️⃣ Respond with success
    res.status(201).json({
      message: "Sign up successful",
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
      },
      token,
    });
  } catch (error) {
    console.error("Doctor signup error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// 🩺 Doctor Login (basic by name)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // ✅ Find doctor by email
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: doctor._id, role: "doctor" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Respond with token and doctor info
    res.status(200).json({
      message: "Signed in successfully",
      token,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt,
      },
    });
  } catch (error) {
    console.error("Doctor login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// 📅 Set Availability
router.post("/set-availability", verifyDoctorToken, setAvailability);

// 📖 Get Doctor Appointments
router.get("/appointments", verifyDoctorToken, getDoctorAppointments);

// ✅ Update Appointment Status (accept/cancel)
router.put("/appointments/:id/status", verifyDoctorToken, updateAppointmentStatus);

// 🔍 Get doctors by specialization
router.get("/getDoctorsBySpecialization", protect, getDoctorsBySpecialization);

// ⏰ Get doctor’s available slots
router.get("/getDoctorSlots/:doctorId", protect, getDoctorSlots);

router.put("/appointments/:appointmentId/complete", protect, markAppointmentCompleted);

export default router;
