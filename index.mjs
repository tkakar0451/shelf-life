import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); 
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}))

// setting up database connection pool
const pool = mysql.createPool({
    host: "jason-smevog.site",
    user: "jasonsme_webuser",
    password: "CSUMB-cst336",
    database: "jasonsme_shelf_life",
    connectionLimit: 10,
    waitForConnections: true,
});
const conn = await pool.getConnection();

//routes
app.get("/", (req, res) => {
    res.render("index", { isLoggedIn: false }); // or true for testing
  });

/*
    Routes for Signup and Login
*/

// route to go to signup page
app.get('/signup', (req, res) => {
    res.render('signup', { warning: null,
                        logIn: req.session.authenticated,
     });
});

app.post('/signup', async(req, res) => {
    let inputUsername = req.body.username;
    let inputPassword = req.body.password;

    // check for input
    if(inputUsername.trim().length == 0){
        return res.render('signup', { warning: "Username cannot be empty.",
                        logIn: req.session.authenticated,
        });
    }
    if (inputPassword.trim().length == 0){
        return res.render('signup', { warning: "Password is not valid.",
                        logIn: req.session.authenticated,
        });
    }

    // Check in database if there is similar username
    let sql = `SELECT username
                FROM Users
                WHERE username = ?`;    
    
    const [rows] = await conn.query(sql, [inputUsername]);
    
    if(rows.length > 0){
        return res.render('signup', { warning: "Username already exists.",
                        logIn: req.session.authenticated,
        });
    }

    // Go to main page (or MyProfile page)
    req.session.authenticated = true;
    return res.redirect('/');
});

// route to login page
app.get('/login', (req, res) =>{
    // if user is not login
    if(!req.session.authenticated){
        res.render('login', { warning: null,
                            logIn: req.session.authenticated,
        });
    } else{
        // if login, redirect to MyProfile page
    }
});

app.post('/login', async(req, res) =>{
    let inputUsername = req.body.username;
    let inputPassword = req.body.password;
    
    let sql = `SELECT username, password
                FROM Users
                WHERE username = ? AND password = ?`;
                
    const [rows] = await conn.query(sql, [inputUsername, inputPassword]);
    
    // return to main page after logging in
    // if not correct, stay at login page and stage the error
    if(rows.length > 0){
        req.session.authenticated = true;
        return res.redirect('/');
    } else{
        return res.render('login', { warning: 'Invalid username or password.' });
    }
});

// route to logout and back to main page (landing page)
app.get('/logout', isAuthenticated, (req, res)=>{
    req.session.destroy();
    res.redirect("/");
})

// function to know if the user is login or not
function isAuthenticated(req, res, next){
    if(!req.session.authenticated){
        res.redirect("/");
    }else{
        next();
    }
}

//---------------------------------------------

/*
    Routes for Review
*/
app.get('/addReview', async(req, res)=>{
    // TODO: get the whole list of books in database to display

    res.render('addReview', { logIn: req.session.authenticated,
                            warning: null,
    });
});

app.post('/addReview', (req, res)=>{
    // TODO: check review before adding to database

    res.render('addReview', { logIn: req.session.authenticated,
                            warning: null,
    });
});

//---------------------------------------------

app.get('/dbTest', async (req, res) => {
    let sql = `SELECT username
                FROM Users
                JOIN Review ON Users.userId = Review.userId
                JOIN Book ON Review.bookId = Book.bookId
                WHERE title LIKE '%Harry%'`;
    const [rows] = await conn.query(sql);
    res.send(rows);
}); //dbTest

app.listen(3000, () => {
    console.log('Express server running');
});
