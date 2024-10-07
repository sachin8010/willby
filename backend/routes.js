const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require('express');
const router = express.Router();
const db = require('./db');
const path = require("path");
const { title } = require("process");
const { start } = require("repl");
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: "mail.localseocompany.in",
  port: 465,
  secure: false,
  auth: {
    user: "info@localseocompany.in",
    pass: "E+bgX@=jO=0p",
  },
});


// JWT secret key
const JWT_SECRET = "your_jwt_secret";


router.get("/databcrypt/:value", async (req, res) => {
  const value = req.params.value;
  const hashedPassword = await bcrypt.hash(value, 10);
  res.status(201).send(hashedPassword);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).send("Error logging in");
    }
    if (results.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, username: user.username },
        "your_jwt_secret",
        { expiresIn: "1h" }
      );
      res.json({ token });
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});

// Middleware to authenticate the token
// Middleware to verify token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("No token provided");

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send("Invalid token");
    req.user = decoded; // Attach user info to the request object
    next();
  });
};

router.get("/user", authenticate, (req, res) => {
  const { id } = req.user;
  const query = "SELECT * FROM users WHERE id = ?";

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching user details");
    }
    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = results[0];
    res.json({ id: user.id, username: user.username, email: user.email });
  });
});

// Set up storage engine for Multer
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}).single("myImage"); // Ensure the field name here matches the form field name

const uploadmulti = multer({ storage }).fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
]);
// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

router.post("/addbanner", async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err });
    } else {
      const { id, title, description } = req.body;

      if (req.file == undefined && id === "") {
        res.status(400).json({ message: "No file selected" });
      } else {
        // if(req.file){
        // res.status(200).send("yes");

        // }else{
        //   res.status(200).send("not");
        // }

        // Insert file metadata into MySQL
        if (id != "") {
          if (req.file != undefined) {
            const { filename, path: filepath } = req.file;
            arrayData = [title, description, filename, filepath, id];
            const insertQuery =
              "UPDATE banners set title=?, description=?, image=?, filepath=? WHERE id=?";
            //  res.status(200).send("yes");
            db.query(insertQuery, arrayData, (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Banner Updated successfully",
                file: req.file,
              });
            });
          } else {
            arrayData = [title, description, id];
            const insertQuery =
              "UPDATE banners set title=?, description=? WHERE id=?";
            db.query(insertQuery, arrayData, (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Banner Updated successfully",
                file: req.file,
              });
            });
          }
        } else {
          const { filename, path: filepath } = req.file;
          const insertQuery =
            "INSERT INTO banners (title, description, image, filepath) VALUES (?, ?, ?, ?)";
          db.query(
            insertQuery,
            [title, description, filename, filepath],
            (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Banner Added successfully",
                file: req.file,
              });
            }
          );
        }
      }
    }
  });
});

router.get("/api/banners", async (req, res) => {
  const query =
    "SELECT `id`, `title`, `description`, `image`, `filepath`, `status`, `created_at`, `updated_at` FROM `banners`";
  // res.status(201).send(query);
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
      // return;
    }

    res.status(201).send(results);
  });
});

router.post("/bannerstatus", async (req, res) => {
  const { id, status } = req.body;
  const sql = "UPDATE banners SET status=? where id=?";
  // res.status(200).send({message:sql});
  db.query(sql, [status, id], (err) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send({ message: "Internal Server Error" });
      // return;
    }

    res.status(200).send({ message: "Status Successfully Updated!" });
  });
});

router.post("/bannerdelete", async (req, res) => {
  const { id } = req.body;
  const sql = "DELETE FROM `banners` WHERE id=?";
  // res.status(200).send({message:sql});
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send({ message: "Internal Server Error" });
      // return;
    }

    res.status(200).send({ message: "Deleted Successfully" });
  });
});

router.post("/bannerDetails", async (req, res) => {
  const { id } = req.body;
  const query = "SELECT * FROM banners WHERE id = ?";

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching user details");
    }
    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    const banner = results[0];
    res.json({
      id: banner.id,
      title: banner.title,
      description: banner.description,
      image: banner.image,
    });
  });
});

// code category query

router.post("/addcategory", async (req, res) => {
  const { id, name } = req.body;

  if (id != "") {
    const sql = "UPDATE categories SET name=? WHERE id=?";
    db.query(sql, [name, id], (err) => {
      if (err) throw err;
      res.status(200).json({
        message: "Category Updated successfully",
      });
    });
  } else {
    const sql = "INSERT INTO categories SET name=?";
    db.query(sql, [name], (err) => {
      if (err) throw err;
      res.status(200).json({
        message: "Category Added successfully",
      });
    });
  }
});

router.get("/api/categories", async (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching user details");
    }
    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    // const category = results[0];
    res.status(200).send(results);
  });
});

router.put("/categoryStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE categories SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/categoryDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM categories WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully");
  });
});

router.get("/categoryDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM categories WHERE id=?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching user details");
    }
    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    const category = results[0];
    res.json({ id: category.id, name: category.name });
  });
});

router.get("/api/categoryDropdown", async (req, res) => {
  const sql = "SELECT id , name FROM categories WHERE status=1";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching user details");
    }
    if (results.length === 0) {
      return res.status(404).send("User not found");
    }
    res.status(200).send(results);
  });
});

// code start  blog managment

router.post("/submitBlog", async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err });
    } else {
      const {
        id,
        title,
        category,
        author,
        short_contant,
        long_contant,
        publish_data,
      } = req.body;

      if (req.file == undefined && id === "") {
        res.status(400).json({ message: "No file selected" });
      } else {
        if (id != "") {
          if (req.file != undefined) {
            const { filename, path: filepath } = req.file;
            arrayData = [
              title,
              category,
              filename,
              filepath,
              short_contant,
              long_contant,
              author,
              publish_data,
              id,
            ];
            const insertQuery =
              "UPDATE blogs SET title=?, category=?, image=?, filepath=?, short_description=?, full_description=?, author_name=?, publish_date=? WHERE id=?";
            //  res.status(200).send("yes");
            db.query(insertQuery, arrayData, (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Blog Updated successfully",
                file: req.file,
              });
            });
          } else {
            arrayData = [
              title,
              category,
              short_contant,
              long_contant,
              author,
              publish_data,
              id,
            ];
            const insertQuery =
              "UPDATE blogs set title=?, category=?, short_description=?, full_description=?, author_name=?, publish_date=? WHERE id=?";
            db.query(insertQuery, arrayData, (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Blog Updated successfully",
                file: req.file,
              });
            });
          }
        } else {
          const { filename, path: filepath } = req.file;
          const insertQuery =
            "INSERT INTO blogs SET title=?, category=?, image=?, filepath=?, short_description=?, full_description=?, author_name=?, publish_date=?";
          db.query(
            insertQuery,
            [
              title,
              category,
              filename,
              filepath,
              short_contant,
              long_contant,
              author,
              publish_data,
            ],
            (err) => {
              if (err) throw err;
              res.status(200).json({
                message: "Blog Added successfully",
                file: req.file,
              });
            }
          );
        }
      }
    }
  });
});

router.get("/api/blogs", async (req, res) => {
  const sql =
    "SELECT blogs.id as id, categories.name as category, blogs.title as title, blogs.image as image,blogs.author_name as author, blogs.publish_date as publish_date, blogs.status as status  FROM `blogs` JOIN categories ON blogs.category = categories.id ORDER BY blogs.id DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.status(200).send(results);
  });
});

router.put("/blogStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const sql = "UPDATE blogs SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/blogDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM blogs WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Blog Deleted Successfully!");
  });
});

router.get("/api/blog/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM blogs where id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    const blog = result[0];
    res.json({
      id: blog.id,
      title: blog.title,
      image: blog.image,
      category: blog.category,
      author: blog.author_name,
      short: blog.short_description,
      long: blog.full_description,
      publish: blog.publish_date,
    });
  });
});

// service code start

router.post("/submitService", async (req, res) => {
  uploadmulti(req, res, (err) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "File upload failed.", error: err });
    }

    const { id, name, short, long } = req.body;

    const files = req.files;
    if (!files && id != "") {
      return res
        .status(400)
        .send({ message: "No files or title were uploaded." });
    }
    if (id != "") {
      const file1Path = files.file1 ? files.file1[0].filename : null;
      const file2Path = files.file2 ? files.file2[0].filename : null;
      let sql =
        "UPDATE services SET name=?, short_description=?, full_description=?";
      let params = [name, short, long];
      if (file1Path) {
        sql += " , main_image=?";
        params.push(file1Path);
      }
      if (file2Path) {
        sql += " , home_image=?";
        params.push(file2Path);
      }
      sql += " WHERE id=?";
      params.push(id);
      db.query(sql, params, (err, result) => {
        if (err) {
          console.error("Error updating data in the database:", err);
          return res.status(500).send({
            message: "Error updating data in the database.",
            error: err,
          });
        }
        res.send({ message: "Service updated successfully!", result });
      });
    } else {
      const file1Path = files.file1[0].filename;
      const file2Path = files.file2[0].filename;

      const query =
        "INSERT INTO services SET name=?, main_image=?, home_image=?, short_description=?, full_description=?";
      db.query(
        query,
        [name, file1Path, file2Path, short, long],
        (err, result) => {
          if (err) {
            console.error("Error inserting data into the database:", err);
            return res.status(500).send({
              message: "Error inserting data into the database.",
              error: err,
            });
          }
          res.send({ message: "Service Add Successfully", result });
        }
      );
    }
  });
});

router.get("/api/services", async (req, res) => {
  const sql =
    "SELECT `id`, `name`, `short_description`, `full_description`, `main_image`, `home_image`, `status` FROM `services` ORDER by id DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.status(200).send(results);
  });
});

router.put("/serverStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE services SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/serviceDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM services WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully!");
  });
});

router.get("/api/service/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM services WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    const data = result[0];
    res.json({
      id: data.id,
      name: data.name,
      image: data.main_image,
      icon: data.home_image,
      short: data.short_description,
      long: data.full_description,
    });
  });
});

// client-reviews code start
router.post("/submitReview", async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "File upload failed.", error: err });
    }

    const { id, name, review, designation } = req.body;

    // const files = req.file;
    if (req.file == undefined && id === "") {
      return res.status(400).send({ message: "No file uploaded." });
    }
    if (id != "") {
      const file1Path = req.file ? req.file.filename : null;
      let sql =
        "UPDATE testimonials SET client_name=?, designation=?, description=?";
      let params = [name, designation, review];
      if (file1Path) {
        sql += " , image	=?";
        params.push(file1Path);
      }
      sql += " WHERE id=?";
      params.push(id);
      db.query(sql, params, (err, result) => {
        if (err) {
          console.error("Error updating data in the database:", err);
          return res.status(500).send({
            message: "Error updating data in the database.",
            error: err,
          });
        }
        res.send({ message: "Review updated successfully!", result });
      });
    } else {
      const file1Path = req.file.filename;

      const query =
        "INSERT INTO testimonials SET client_name=?, designation=?, description=?, image=?";
      db.query(query, [name, designation, review, file1Path], (err, result) => {
        if (err) {
          console.error("Error inserting data into the database:", err);
          return res.status(500).send({
            message: "Error inserting data into the database.",
            error: err,
          });
        }
        res.send({ message: "Review Add Successfully", result });
      });
    }
  });
});

router.get("/api/reviews", async (req, res) => {
  const sql =
    "SELECT `id`,`client_name` as `name`, `designation`, `description`, `image`, `status` FROM `testimonials` ORDER by id DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.status(200).send(results);
  });
});

router.put("/reviewStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE testimonials SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/reviewDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM testimonials WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully!");
  });
});

router.get("/api/review/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM testimonials WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    const data = result[0];
    res.json({
      id: data.id,
      name: data.client_name,
      image: data.image,
      designation: data.designation,
      review: data.description,
    });
  });
});

// website setting code start

const uploadwebsite = multer({ storage }).fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 },
]);

router.get("/api/website/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM websites WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    const data = result[0];
    res.json({
      id: data.id,
      logo: data.logo,
      favicon: data.favicon,
      footerLogo: data.footer_logo,
      email: data.email,
      contact: data.contact_no,
      address: data.address,
      open: data.open_time,
      close: data.close_time,
      facebook: data.facebook,
      instagram: data.instagram,
      twitter: data.twitter,
      about: data.about,
    });
  });
});

router.post("/websiteService", async (req, res) => {
  uploadwebsite(req, res, (err) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "File upload failed.", error: err });
    }

    const {
      id,
      email,
      contact,
      openTime,
      closeTime,
      address,
      facebook,
      instagram,
      twitter,
      about,
    } = req.body;

    const files = req.files;
    if (!files && id != "") {
      return res
        .status(400)
        .send({ message: "No files or title were uploaded." });
    }
    if (id != "") {
      const file1Path = files.file1 ? files.file1[0].filename : null;
      const file2Path = files.file2 ? files.file2[0].filename : null;
      const file3Path = files.file3 ? files.file3[0].filename : null;
      let sql =
        "UPDATE websites SET email=?, contact_no=?, open_time=?, close_time=?, address=?, facebook=?, instagram=?, twitter=?, about=?";
      let params = [
        email,
        contact,
        openTime,
        closeTime,
        address,
        facebook,
        instagram,
        twitter,
        about,
      ];
      if (file1Path) {
        sql += " , logo=?";
        params.push(file1Path);
      }
      if (file2Path) {
        sql += " , favicon=?";
        params.push(file2Path);
      }
      if (file3Path) {
        sql += " , footer_logo=?";
        params.push(file3Path);
      }
      sql += " WHERE id=?";
      params.push(id);
      db.query(sql, params, (err) => {
        if (err) {
          console.error("Error updating data in the database:", err);
          return res.status(500).send({
            message: "Error updating data in the database.",
            error: err,
          });
        }
        res.send("Updated successfully!");
      });
    } else {
      const file1Path = files.file1[0].filename;
      const file2Path = files.file2[0].filename;
      const file3Path = files.file3[0].filename;

      const query =
        "INSERT INTO websites SET email=?, contact_no=?, open_time=?, close_time=?, address=?, facebook=?, instagram=?, twitter=?, about=?, logo=?, favicon=?, footer_logo=?";
      db.query(
        query,
        [
          email,
          contact,
          openTime,
          closeTime,
          address,
          facebook,
          instagram,
          twitter,
          about,
          file1Path,
          file2Path,
          file3Path,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data into the database:", err);
            return res.status(500).send({
              message: "Error inserting data into the database.",
              error: err,
            });
          }
          res.json({ message: "Add Successfully", result });
        }
      );
    }
  });
});

// plan code start
router.post("/planServiceAdd", async (req, res) => {
  const { plan_id, name, provide } = req.body;
  const sql = "INSERT INTO plan_services SET plan_id=?, name=?, provide=?";
  db.query(sql, [plan_id, name, provide], (err) => {
    if (err) throw err;
    res.status(200).json({
      message: "Add Successfully",
    });
  });
});

router.post("/planSubmit", async (req, res) => {
  const { id, name, price, validity, session } = req.body;
  if (id != "") {
    const sql = "UPDATE plans SET name=?, amount=?, validity=? WHERE id=?";
    db.query(sql, [name, price, validity, id], (err) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(200).json({
        message: "Updated Plan Successfully",
      });
    });
  } else {
    const sql = "INSERT INTO plans SET name=?, amount=?, validity=?";
    db.query(sql, [name, price, validity], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ message: "Database error" });
      }
      const lastInsertId = result.insertId;
      const update = "UPDATE plan_services SET plan_id=? WHERE plan_id=?";
      db.query(update, [lastInsertId, session], (err1) => {
        if (err1) {
          console.error("Error inserting data:", err1);
          return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({
          message: "Add Plan Successfully",
        });
      });
    });
  }
});

router.get("/planServices/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM plan_services WHERE plan_id=?";
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.status(200).send(results);
  });
});

router.get("/plan/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM plans WHERE id=?";
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

router.get("/planServicedelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM plan_services WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully!");
  });
});

router.get("/api/plans", async (req, res) => {
  const sql = "SELECT * FROM plans ORDER BY `id` DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.put("/planStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE plans SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/planDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM plans WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully!");
  });
});

// code start faq's
router.post("/faqSubmit", async (req, res) => {
  const { id, question, answers } = req.body;
  if (id != "") {
    const sql = "UPDATE faqs SET question=?, answers=? WHERE id=?";
    db.query(sql, [question, answers, id], (err) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(200).json({
        message: "Updated question Successfully",
      });
    });
  } else {
    const sql = "INSERT INTO faqs SET question=?, answers=?";
    db.query(sql, [question, answers], (err) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(200).json({
        message: "Add question Successfully",
      });
    });
  }
});

router.get("/api/questionDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM faqs WHERE id=?";
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

router.get("/api/questions", async (req, res) => {
  const sql = "SELECT * FROM faqs ORDER BY `id` DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.put("/questionStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE faqs SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/questionDelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM faqs WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully!");
  });
});

// pages and nav bar and sections management

router.get("/api/pages", async (req, res) => {
  const sql =
    "SELECT `id`, `page_name`, `page_url`, `mate_title`, `mate_description`, `mate_keywords`, `status` FROM `pages`";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.post("/pageUpdate", async (req, res) => {
  const { id, title, description, keywords } = req.body;

  const sql =
    "UPDATE `pages` SET mate_title=?, mate_description=?, mate_keywords=? WHERE id=?";
  db.query(sql, [title, description, keywords, id], (err) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json({
      message: "Updated question Successfully",
    });
  });
});

router.put("/pageStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE pages SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

router.get("/api/pageDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM pages WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

router.get("/api/sectionList/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM sections WHERE FIND_IN_SET(?, pages)";
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.post("/sectionDetailsSubmit", async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err });
    } else {
      const { id, headline, description, other_details } = req.body;

      if (req.file == undefined && id === "") {
        res.status(400).json({ message: "No file selected" });
      } else {
        let sql = "UPDATE `sections` SET headline=?";
        let param = [headline];
        if (description != "") {
          sql += " , description=?";
          param.push(description);
        }
        if (req.file != undefined) {
          const { filename } = req.file;
          sql += " , image=?";
          param.push(filename);
        }
        if (other_details != "") {
          sql += " , other_details=?";
          param.push(other_details);
        }

        sql += " WHERE id=?";
        param.push(id);

        db.query(sql, param, (err) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ message: "Database error" });
          }
          res.status(200).json({
            message: "Updated Section Successfully",
          });
        });
      }
    }
  });
});

router.get("/api/sectionDetail/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM sections WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

// now code using website apis making procss
router.get("/api/bannerData", async (req, res) => {
  const sql =
    "SELECT `id`, `title`, `description`, `image`, `filepath`, `status`, `created_at`, `updated_at` FROM `banners` WHERE status='1'";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/sectionData/:id", async (req, res) => {
  const { id } = req.params;
  let sql = "SELECT * FROM sections WHERE FIND_IN_SET(?, pages) ";
  if (id == 2) {
    sql += "ORDER BY `position` ASC";
  }
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/servicesData", async (req, res) => {
  const sql = "SELECT * FROM services WHERE status='1' ORDER BY `id` DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/reviewsData", async (req, res) => {
  const sql = "SELECT * FROM testimonials WHERE status='1' ORDER BY `id` DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/blogsData", async (req, res) => {
  const sql = "SELECT * FROM blogs WHERE status='1' ORDER BY `id` DESC";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/plansData", async (req, res) => {
  const sql = `SELECT plans.id as main_id , plans.name as plans_names, plans.validity, plans.amount, plan_services.* FROM plans left JOIN plan_services ON plans.id = plan_services.plan_id WHERE plans.status = 1`;
  // res.send(sql)
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.get("/api/faqsData", async (req, res) => {
  const sql =
    "SELECT `id`, `question`, `answers`, `status`, `created_at`, `updated_at` FROM `faqs` WHERE status = 1 order BY id DESC";
  // res.send(sql)
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.post("/api/mail/", async (req, res) => {
  const { first, last, email, phone, message } = req.body;
  const body = `
      <h3>Support Request</h3>
      <p><strong>Name:</strong> ${first} ${last}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Contact number:</strong> ${phone}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;
  const mailOption = {
    from: "kumargtesting@gmail.com",
    to: "kumargtesting@gmail.com",
    subject: "Website Inquiry",
    html: body,
  };
  const sql = "INSERT INTO inquires SET name=?, email=?, contact=?, message=?";
  db.query(sql, [first + " " + last, email, phone, message], (err) => {
    if (err) {
      return res.status(500).json({ error: err });
    } else {
      transporter.sendMail(mailOption, function (error) {
        if (error) {
          return res.status(500).json({ error: error });
        } else {
          return res.status(200).json({ message: "sended.." });
        }
      });
    }
  });
});

router.get("/api/inquiries", async (req, res) => {
  const sql = "select * from inquires order by id desc";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.put("/inquiryStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE inquires SET status=? WHERE id=?";
  db.query(sql, [status, id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Status Successfully Updated!");
  });
});

// now start api making form register and login and after login working
router.post("/customer/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = "SELECT username FROM customers WHERE username=?";
  db.query(sql, [username], (err, result) => {
    if (err) {
      return res.status(201).json({ error: err , line: '1266' });
    }
    if (result.length > 0) {
      return res.status(201).json({ error: "Email already Exists" , line: '1269' });
    }
    const insert = "INSERT INTO customers SET username=?, password=?";
    db.query(insert, [username, hashedPassword], (error) => {
      if (error) {
        return res.status(500).json({ error: error, line: '1274' });
      }

      const body = `
                <h3>Dear Member, </h3>
                <p>Thank you for signing up for willby.com ! We're excited to have you on board</p>
                <p>Best regards</p>
                <p>willby</p>
                <p>thank you</p>
              `;
      const mailOption = {
        from: "kumargtesting@gmail.com",
        to: username,
        subject: "Welcome to WillBy",
        text: "testing",
      };
    return res.status(200).json({ message: "Welcome Will By... " , line: '1290' })
    //   await transporter.sendMail(mailOption, function (error1) {
    //     if (error1) {
    //       return res.status(201).json({ error: error1 , line: '1293' });
    //     } else {
    //       return res.status(200).json({ message: "Welcome Will By... " , line: '1295' });
    //     } 
    //   });
    
    // const emailresponce = await transporter.sendMail(mailOption);
    // return res.status(200).json({ error: emailresponce , line: '1300' });
        // return ;
    });
  });
});

router.post("/customer/login", async (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM customers WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).send("Error logging in");
    }
    if (results.length === 0) {
      return res.status(201).send("Invalid credentials");
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, username: user.username },
        "your_jwt_secret",
        { expiresIn: "1h" }
      );
      res.json({ token: token, customer_id: user.id });
    } else {
      res.status(201).send("Password Not Match");
    }
  });
});

router.post("/customer/familyAdd", async (req, res) => {
  const data = req.body; // Assuming the data is sent in JSON format

  // Build the SQL query dynamically
  const columns = Object.keys(data).join(", ");
  const placeholders = Object.keys(data)
    .map(() => "?")
    .join(", ");
  const values = Object.values(data);

  const sql = `INSERT INTO customer_family_members (${columns}) VALUES (${placeholders})`;
  db.query(sql, values, (err) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).send("Error inserting data");
    }
    res.status(200).send("Family Member Add successfully");
  });
});
router.post("/customer/familyUpdate", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      return res.status(400).send("ID is required to update the record");
    }

    // Remove the 'id' from the data object to avoid updating it
    const { id: _, ...updateData } = data;

    // Extract columns and values from updateData
    const columns = Object.keys(updateData);
    const values = Object.values(updateData);

    // Create the SET clause for the UPDATE query
    const setClause = columns.map((column) => `${column} = ?`).join(", ");

    // Define the SQL query with a WHERE clause to target the specific record
    const sql = `UPDATE customer_family_members SET ${setClause} WHERE id = ?`;

    // Append the id as the last value for the WHERE clause
    const finalValues = [...values, id];

    // Execute the query
    db.query(sql, finalValues, (err) => {
      if (err) {
        console.error("Error updating data:", err);
        return res.status(500).send("Error updating data");
      }
      res.send("Record updated successfully");
    });
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/family/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `first_name`, `middle_name`, `last_name`, `relation` FROM `customer_family_members` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.get("/customer/deleteFamilyMember/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM customer_family_members WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    return res.status(200).json({ message: "Delete Successfully...." });
  });
});

router.get("/customer/detailsFamilyMember/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `first_name`, `middle_name`, `last_name`, `relation`, `join_will`, `dob_option`, `dob`, `phone_option`, `phone_code`, `phone_number`, `email_option`, `email_address`, `residential_address_option`, `street`, `suburb`, `state`, `zip_code`, `country`, `contact_under_age` FROM `customer_family_members` WHERE id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.get("/api/countries", async (req, res) => {
  const sql = "SELECT `id`, `name`,`code` FROM `countries`";
  // res.send(sql)
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.get("/api/states/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `name`, `country_id` FROM `states` WHERE country_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.post("/customer/customerActions", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_personal (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error inserting data");
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_personal SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/customerDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `resident_age`, `title`, `first_name`, `middle_name`, `last_name`, `different_name`, `different_first_name`, `different_middle_name`, `different_last_name`, `email_address`, `phone_code`, `contact_no`, `address1`, `address2`, `city`, `state`, `zip`, `date_of_birth`, `marital_status`, `spouse_couple_package`, `spouse_email_address`, `spouse_first_name`, `spouse_middle_name`, `spouse_last_name`, `do_you_children`, `status`, `created_at`, `updated_at`, `do_you_pets`, `last_message` FROM `customer_personal` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.post("/customer/substituteAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO substitute_executor (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error inserting data");
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE substitute_executor SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/substituteExecutor/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `first_name`, `middle_name`, `last_name`, `relation`, `status`, `created_at`, `updated_at` FROM substitute_executor WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.get("/customer/deleteSubstituteExecutor/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM substitute_executor WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    return res.status(200).json({ message: "Delete Successfully...." });
  });
});

router.get("/customer/detailsSubstituteExecutor/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `first_name`, `middle_name`, `last_name`, `relation`, `status`, `created_at`, `updated_at` FROM `substitute_executor` WHERE id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.post("/customer/executorsAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_executors (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error inserting data");
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_executors SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/executorsDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `someone_else`, `spouse`, `first_name`, `middle_name`, `last_name`, `primary_executor_address`, `primary_executor_relation`, `substitute_executor`, `status`, `created_at`, `updated_at` FROM `customer_executors` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.post("/customer/estateAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
        
        if (data.share_percent === '' || isNaN(data.share_percent)) {
              data.share_percent = null; // Or set to 0.0, depending on your use case
            }
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_estate (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send(err);
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;
      
      if (updateData.share_percent === '' || isNaN(updateData.share_percent)) {
  updateData.share_percent = null; // Or set to 0.0, depending on your business logic
}


      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_estate SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/estateDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `select_beneficiary`, `full_name`, `address`, `relationship`, `beneficiary_number`, `beneficiary_full_name`, `beneficiary_address`, `beneficiary_relation`, `share_percent`, `status`, `created_at`, `updated_at` FROM `customer_estate` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.post("/customer/residualEstateAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_residual_estate (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error inserting data");
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_residual_estate SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/residualEstateDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `age_option`, `age`, `charit_option`, `details_of_gift`, `status`, `created_at`, `updated_at` FROM `customer_residual_estate` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.get("/customer/petsList/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `pet_name`, `pet_description`, `pet_guardian_name`, `pet_guardian_relation`, `pet_guardian_address`, `pet_maintenance`, `status`, `created_at`, `updated_at` FROM `customer_pets` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results);
  });
});

router.post("/customer/petsAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_pets (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error inserting data");
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_pets SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/deletePets/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM customer_pets WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    return res.status(200).json({ message: "Delete Successfully...." });
  });
});

router.get("/customer/detailsPets/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `pet_name`, `pet_description`, `pet_guardian_name`, `pet_guardian_relation`, `pet_guardian_address`, `pet_maintenance`, `status`, `created_at`, `updated_at` FROM `customer_pets` WHERE id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});

router.post("/customer/liabilitiesAction", async (req, res) => {
  try {
    // Extract data from request body
    const data = req.body;
    const id = data.id; // Assuming 'id' is part of the request body to identify the record to update

    if (!id) {
         if (data.realestate_number === '' || isNaN(data.realestate_number)) {
              data.realestate_number = null; // Or set to 0.0, depending on your use case
            }
        
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      const sql = `INSERT INTO customer_liabilities (${columns}) VALUES (${placeholders})`;
      db.query(sql, values, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send(err);
        }
        res.status(200).send("Details Add successfully");
      });
    } else {
      // Remove the 'id' from the data object to avoid updating it
      const { id: _, ...updateData } = data;
      
      if (updateData.realestate_number === '' || isNaN(updateData.realestate_number)) {
          updateData.realestate_number = null; // Or set to 0.0, depending on your business logic
        }

      // Extract columns and values from updateData
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);

      // Create the SET clause for the UPDATE query
      const setClause = columns.map((column) => `${column} = ?`).join(", ");

      // Define the SQL query with a WHERE clause to target the specific record
      const sql = `UPDATE customer_liabilities SET ${setClause} WHERE id = ?`;

      // Append the id as the last value for the WHERE clause
      const finalValues = [...values, id];

      // Execute the query
      db.query(sql, finalValues, (err) => {
        if (err) {
          console.error("Error updating data:", err);
          return res.status(500).send("Error updating data");
        }
        res.send("Details Updated successfully");
      });
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Server error");
  }
});

router.get("/customer/liabilitiesDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT `id`, `customer_id`, `liabilities_details_option`, `realestate_option`, `bank_option`, `share_option`, `bonds_option`, `superannuation_option`, `family_option`, `personal_option`, `details_of_liabilities_option`, `realestate_number`, `ownership_types`, `addresses`, `bank_details`, `share_details`, `bonds_details`, `superannuation_details`, `superannuation_liabilities_details`, `superannuation_death_benefit_nomination`, `superannuation_donate_organs`, `family_trusts_details`, `family_specific_bequests`, `funeral_details`, `status`, `created_at`, `updated_at` FROM `customer_liabilities` WHERE customer_id=?";
  // res.send(sql)
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // console.log(results);  // Log the results to see what is being returned
    res.json(results[0]);
  });
});


router.post("/api/instagramSave", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
       res.status(500).send("Error uploading file");
    }

    try {
      // Extract data from request body
      const data = req.body;
      const id = data.id; // Assuming 'id' is used to identify the record for update

      // Handle file upload if it exists
      let filePath = null;
      if (req.file) {
        filePath = req.file.path; // Path to the uploaded file
      }

      // Remove 'id' from the data object to avoid updating it directly
      const { id: _, ...instagramData } = data;

      // Add the file path to instagramData if the file was uploaded
      if (filePath) {
        instagramData.file = filePath;
      }

      // If id exists, perform an update; otherwise, perform an insert
      if (id) {
        // Extract columns and values from instagramData for updating
        const columns = Object.keys(instagramData);
        const values = Object.values(instagramData);

        // Create the SET clause for the UPDATE query
        const setClause = columns.map((column) => `${column} = ?`).join(", ");

        // Define the SQL query for updating
        const sqlUpdate = `UPDATE instagrams SET ${setClause} WHERE id = ?`;
        const finalValues = [...values, id]; // Add id for WHERE clause

        // Execute the update query
        db.query(sqlUpdate, finalValues, (err) => {
          if (err) {
            console.error("Error updating data:", err);
            return res.status(500).send("Error updating data");
          }
          res.send("Record updated successfully");
        });
      } else {
        // Prepare for insert: extract columns and values from instagramData
        const columns = Object.keys(instagramData);
        const values = Object.values(instagramData);

        // Create the INSERT query
        const placeholders = columns.map(() => "?").join(", ");
        const sqlInsert = `INSERT INTO instagrams (${columns.join(", ")}) VALUES (${placeholders})`;

        // Execute the insert query
        db.query(sqlInsert, values, (err) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).send(err);
          }
          res.send("Record inserted successfully");
        });
      }
    } catch (err) {
      console.error("Error processing request:", err);
      res.status(500).send("Server error");
    }
  });
});


router.get("/api/instagramDetail/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM instagrams WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

// now code using website apis making procss
router.get("/api/instagramData", async (req, res) => {
  const sql =
    "SELECT `id`, `file`, `url`, `status` FROM `instagrams`";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


router.post("/api/instagramtatus", async (req, res) => {
  const { id, status } = req.body;
  const sql = "UPDATE instagrams SET status=? where id=?";
  // res.status(200).send({message:sql});
  db.query(sql, [status, id], (err) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send({ message: "Internal Server Error" });
      // return;
    }

    res.status(200).send({ message: "Status Successfully Updated!" });
  });
});

router.post("/api/instagramdelete", async (req, res) => {
  const { id } = req.body;
  const sql = "DELETE FROM `instagrams` WHERE id=?";
  // res.status(200).send({message:sql});
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send({ message: "Internal Server Error" });
      // return;
    }

    res.status(200).send({ message: "Deleted Successfully" });
  });
});



// now code using website apis making procss
router.get("/api/customersAll", async (req, res) => {
  const sql =
    "SELECT `id`, `username`, `password`, `status`, `created_at`, `updated_at` FROM `customers`";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get("/api/customersDetails/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM customers WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send("Deleted Successfully");
  });
});


// Export the router
module.exports = router;
