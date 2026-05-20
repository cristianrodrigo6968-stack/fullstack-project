
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "dkrrtbumb",
  api_key: "559181598277121",
  api_secret: "zeLQZkgKucG3XKkvd6lAauYTDLw",
});

export default cloudinary;
{/*
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;   LIBROS */}