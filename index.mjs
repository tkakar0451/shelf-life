import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

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
app.get('/', (req, res) => {
    res.send('Hello Express app!');
});

/*
    Routes for Signup and Login
*/

// route to go to signup page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// route to login page
app.get('/login', (req, res) =>{
    res.render('login', { warning: null });
});

app.post('/login', async(req, res) =>{
    let username = req.body.username;
    let password = req.body.password;
    let passwordHash = '';
    
    /*let sql = ``;
    const [rows] = await conn.query(sql, [username]);
    
     if(rows.length > 0){
        passwordHash = rows[0].password;
    }
    
    const match = await bcrypt.compare(password, passwordHash);*/
    
    // return to main page after logging in
    // if not correct, stay at login page and stage the error
    // NOTE: this is temporary to test the validation
    if(username == "admin" && password == "123"){
        res.session.authenticated = true;
        res.redirect('/');
    } else{
        res.render('login', { warning: 'Invalid username or password.' });
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
