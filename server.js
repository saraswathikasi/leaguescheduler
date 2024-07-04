const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
//  const db = require('./models');



const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

// Configure express-session middleware
app.use(session({
  secret: '/./@#$<>98)(', // Replace with a strong secret
  resave: false,
  saveUninitialized: true
}));

// Set main directory
app.set('views', path.join(__dirname, 'main'));

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}
// PostgreSQL connection pool setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
  });
  
  // Routes
  app.get('/', (req, res) => {
    res.render('dashboard');
  });
  
  //register
  app.get('/register', (req, res) => {
    res.render('register');
  });
  
  app.post('/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: ' Email and Password is required' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [name, email, hashedPassword, role]
      );
      res.redirect('/login');
    } catch (err) {
      console.error('Error in registration:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  
  //login
  app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
     if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
     }

    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  
      if (result.rows.length === 0) {
        return res.status(401).send('User not found');
      }
  
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
  
      if (!validPassword) {
        return res.status(401).send('Invalid password');
      }
  
      // Store user object in session
      req.session.user = user;
  
      // Redirect based on user role
      if (user.role === 'admin') {
        res.redirect('/admindash');
      } else if (user.role === 'player') {
        res.redirect('/playerdash');
      } else {
        res.redirect('/login'); // Handle unexpected role if needed
      }
  
    } catch (err) {
      console.error('Error in login:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  
  // Admin dashboard 
  
  app.get('/admindash', isAuthenticated, async (req, res) => {
    try {
      // Fetch sports and sessions data from database
      const sportsQuery = await pool.query('SELECT * FROM sports');
      const sessionsQuery = await pool.query(`
        SELECT sessions.*, sports.name AS sport_name, users.name AS creator_name
        FROM sessions
        JOIN sports ON sessions.sport_id = sports.id
        JOIN users ON sessions.creator_id = users.id
      `);
  
      // Render admin dashboard with sports and sessions data
      res.render('admindash', {
        user: req.session.user,
        sports: sportsQuery.rows,
        sessions: sessionsQuery.rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  //creating sport
  app.post('/create-sport', isAuthenticated, async (req, res) => {
    const { name } = req.body;
  
    try {
      // Insert new sport into the database
      await pool.query('INSERT INTO sports (name) VALUES ($1)', [name]);
      res.redirect('/admindash');
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create sport' });
    }
  });
  
  //creating session
  
  app.post("/create-session", isAuthenticated, async (req, res) => {
    const { sport_id, team1, team2, additional_players, date, venue } = req.body;
    try {
        await pool.query(
            "INSERT INTO sessions (sport_id, creator_id, team1, team2, additional_players, date, venue) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
                sport_id,
                req.session.user.id,
                team1,
                team2,
                additional_players,
                date,
                venue,
            ]
        );
        res.redirect("/admindash");
    } catch (err) {
        console.error("Error creating session:", err);
        // Handle error appropriately, e.g., redirect to an error page
        res.status(500).send("Error creating session. Please try again later.");
    }
  });
  
  //joining a session
  
  app.post("/join-session", isAuthenticated, async (req, res) => {
    const { session_id } = req.body;
    const user_id = req.session.user.id;
  
    try {
      // Retrieve user role from the database
      const userResult = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [user_id]
      );
      const user = userResult.rows[0];
      // Check if the user is already joined to the session
      const existing = await pool.query(
        "SELECT * FROM participants WHERE session_id = $1 AND user_id = $2",
        [session_id, user_id]
      );
  
      if (existing.rows.length > 0) {
       
          alert("User is an already joined");
    
        console.log("User is already joined to the session");
      } else {
        // If not, join the session
        await pool.query(
          "INSERT INTO participants (session_id, user_id) VALUES ($1, $2)",
          [session_id, user_id]
        );
      }
  
      res.json({ success: true }); // Respond with success
    } catch (err) {
      console.error("Error joining session:", err);
      res.status(500).json({ error: "Error joining session. Please try again later." });
    }
  });
  
  // Delete session route for admin
  app.post("/delete-session/:id", isAuthenticated, async (req, res) => {
    const sessionId = req.params.id;
    const session = await pool.query("SELECT * FROM sessions WHERE id = $1 AND creator_id = $2", [sessionId, req.session.user.id]);
    if (session.rows.length === 0) {
      return res.status(404).send("Session not found or you are not authorized to delete this session.");
    }
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    res.redirect("/admindash"); // Redirect to a relevant page after deletion
  });
  
  
  
  // player dash board
  
  app.get("/playerdash", isAuthenticated, async (req, res) => {
    try {
      const sessionsQuery = await pool.query(`
        SELECT sessions.*, sports.name AS sport_name,
               EXISTS (SELECT 1 FROM participants WHERE session_id = sessions.id AND user_id = $1) AS is_joined
        FROM sessions
        JOIN sports ON sessions.sport_id = sports.id
        ORDER BY sessions.date DESC
      `, [req.session.user.id]);
      const sports = await pool.query("SELECT * FROM sports");
      res.render("playerdash", {
        user: req.session.user,
        sessions: sessionsQuery.rows,
        sports: sports.rows,
      });
    } catch (err) {
      console.error("Error fetching player dashboard:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  //  joining a session
  app.post("/join-player-session", isAuthenticated, async (req, res) => {
    const { session_id } = req.body;
    const user_id = req.session.user.id;
    try {
      const existing = await pool.query(
        "SELECT * FROM participants WHERE session_id = $1 AND user_id = $2",
        [session_id, user_id]
      );
      if (existing.rows.length > 0) {
        console.log("User is already joined to the session");
      } else {
        await pool.query(
          "INSERT INTO participants (session_id, user_id) VALUES ($1, $2)",
          [session_id, user_id]
        );
      }
      res.redirect("/playerdash");
    } catch (err) {
      console.error("Error joining session:", err);
      res.status(500).json({ error: "Error joining session. Please try again later." });
    }
  });
  
  //creating a session by player
  app.post("/create-player-session", isAuthenticated, async (req, res) => {
    const { sport_id, team1, team2, additional_players, date, venue } = req.body;
    try {
        await pool.query(
            "INSERT INTO sessions (sport_id, creator_id, team1, team2, additional_players, date, venue) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
                sport_id,
                req.session.user.id,
                team1,
                team2,
                additional_players,
                date,
                venue,
            ]
        );
        res.redirect("/playerdash");
    } catch (err) {
        console.error("Error creating session:", err);
        res.status(500).send("Error creating session. Please try again later.");
    }
  });
  
  // Delete session route for player
  app.post("/delete-player-session/:id", isAuthenticated, async (req, res) => {
    const sessionId = req.params.id;
    try {
      await pool.query("DELETE FROM participants WHERE session_id = $1", [sessionId]);
      await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
      res.redirect("/playerdash"); 
    } catch (err) {
      console.error("Error deleting session:", err);
      res.status(500).send("Error deleting session. Please try again later.");
    }
  });
  
  //reports
  
  app.get("/reports", isAuthenticated, async (req, res) => {
    try {
      const sessionsQuery = `
        SELECT sessions.*, sports.name AS sport_name
        FROM sessions
        JOIN sports ON sessions.sport_id = sports.id
      `;
      const popularityQuery = `
        SELECT sports.name, COUNT(sessions.id) AS count
        FROM sessions
        JOIN sports ON sessions.sport_id = sports.id
        GROUP BY sports.name
      `;
      const sessionsResult = await pool.query(sessionsQuery);
      const popularityResult = await pool.query(popularityQuery);
      res.render("reports", {
        sessions: sessionsResult.rows,
        popularity: popularityResult.rows,
      });
    } catch (err) {
      console.error("Error fetching reports data:", err);
      res.status(500).send("Error fetching reports data");
    }
  });
  
  
  // Logout route
  app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to log out.");
      }
      res.redirect('/login');
    });
  });
  
  //password change
  app.get('/change', (req, res) => {
    res.render('change.ejs', {user: req.session.user});
  });
  app.post('/change-password',  isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const email = req.session.user.email;

   if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
    }
    try {
        console.log('Form data:', req.body);
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        const user = result.rows[0];
        console.log('Retrieved user:', user);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password); // Corrected field name
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        // Update password in the database
        const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2'; // Corrected field name
        await pool.query(updateQuery, [passwordHash, user.id]);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'Error changing password. Please try again later.' });
    }
  });
  
  //handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something broke!' });
  });

  
// Middleware to parse the form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (e.g., HTML, CSS)
app.use(express.static('public'));
// Handle form submission
app.post('/contactsubmit', (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  const review = req.body.review;

  console.log(`Feedback received:
  Email: ${email}
  Phone: ${phone}
  Review: ${review}`);
  res.json({ message: 'Feedback submitted successfully!' });
});
  
  //port env
  if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`App listening on port ${PORT}`);
    });
  }
  
  module.exports = app;
