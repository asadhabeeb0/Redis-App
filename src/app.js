const express = require('express');
const hbs = require("hbs");
const path = require("path");
const redis = require('ioredis');

const client = redis.createClient();

client.on('connect', () => {
  console.log('Redis Server connected');
});

client.on('error', (err) => {
  console.error(`Redis Error: ${err}`);
});

const port = process.env.PORT || 3000;
const app = express();

const static_path = path.join(__dirname, "../public");
const tempaltes_path = path.join(__dirname, "../templates/views");
partials_path = path.join(__dirname, "../templates/partials");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views", tempaltes_path);
hbs.registerPartials(partials_path)


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/getUser", (req, res) => {
  res.render("getUser");
})

app.post("/getUser", function (req, res, next) {
  const id = req.body.id;
  client.hgetall(id, function (err, obj) {
    if (!obj) {
      res.render('getUser', {
        error: 'User does not exist'
      });
    } else {
      obj.id = id;
      res.render('getUserResponse', {
        user: obj
      });
    }
  });
});

app.get("/getUsers", (req, res) => {
  res.render("getUsers");
})

app.post("/getUsers", (req, res) => {
  client.keys('*', function (err, keys) {
    if (err) {
      console.error('Error fetching users from Redis:', err);
      res.render("getUsersResponse", {
        error: "Error fetching users",
        users: []
      });
    } else {
      const users = [];
      keys.forEach((key) => {
        client.hgetall(key, function (err, user) {
          if (!err && user) {
            user.id = key;
            users.push(user);
          }
          if (users.length === keys.length) {
            res.render("getUsersResponse", {
              users: users,
              error: null
            });
          }
        });
      });
    }
  });
});



app.get("/addUser", (req, res) => {
  res.render("addUser");
})

app.post('/addUser', function (req, res, next) {
  const id = req.body.id;
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const email = req.body.email;
  const phone = req.body.phone;
  client.hmset(id, [
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'phone', phone
  ], function (err, reply) {
    if (err) {
      console.log('Add User Error:', err);
    }
    console.log(reply);
    res.render('addUserMessage');
  });
});


app.get("/updateUser", (req, res) => {
  res.render("updateUser");
});

app.post("/updateUser", function (req, res, next) {
  const id = req.body.id;
  const newid = req.body.id;
  const newFirstName = req.body.first_name;
  const newLastName = req.body.last_name;
  const newEmail = req.body.email;
  const newPhone = req.body.phone;

  client.hgetall(id, function (err, obj) {
    if (!obj) {
      res.render("updateUser", {
        error: "User does not exist"
      });
    } else {
      if (newid) {
        obj.id = newid;
      }
      if (newFirstName) {
        obj.first_name = newFirstName;
      }
      if (newLastName) {
        obj.last_name = newLastName;
      }
      if (newEmail) {
        obj.email = newEmail;
      }
      if (newPhone) {
        obj.phone = newPhone;
      }

      client.hmset(id, obj, function (err) {
        if (err) {
          console.error("Error updating user:", err);
          res.render("updateUser", {
            error: "Error updating user"
          });
        } else {
          res.render("updateUserResponse", {
            message: "User updated successfully",
            user: obj
          });
        }
      });
    }
  });
});





app.get("/deleteUser", (req, res) => {
  res.render("deleteUser");
});

// Route to delete a user by ID
app.post('/deleteUser', (req, res) => {
  const userId = req.body.id; // Assuming you pass the user's ID in the request body

  // Check if the user with the provided ID exists
  client.exists(userId, async (err, userExists) => {
    if (err) {
      console.error('Error checking user existence:', err);
      res.status(500).send('Internal Server Error');
    } else {
      if (userExists) {
        // If the user exists, delete them
        client.del(userId, (err) => {
          if (err) {
            console.error('Error deleting user:', err);
            res.status(500).send('Internal Server Error');
          } else {
            // User successfully deleted, you can render a response page or redirect to another route
            res.render('deleteUserMessage', { message: 'User deleted successfully' });
          }
        });
      } else {
        // User with the provided ID does not exist
        res.render('deleteUserMessage', { message: 'User not found' });
      }
    }
  });
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});