import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: true,
    })
);

// setting up database connection pool
const pool = mysql.createPool({
    host: 'jason-smevog.site',
    user: 'jasonsme_webuser',
    password: 'CSUMB-cst336',
    database: 'jasonsme_shelf_life',
    connectionLimit: 10,
    waitForConnections: true,
});
const conn = await pool.getConnection();

//routes
app.get('/', (req, res) => {
    res.render('index', { logIn: req.session.authenticated }); // or true for testing
});

/*
    Routes for Signup and Login
*/

// route to go to signup page
app.get('/signup', (req, res) => {
    res.render('signup', { warning: null, logIn: req.session.authenticated });
});

app.post('/signup', async (req, res) => {
    let inputUsername = req.body.username;
    let inputPassword = req.body.password;

    // check for input
    if (inputUsername.trim().length == 0) {
        return res.render('signup', {
            warning: 'Username cannot be empty.',
            logIn: req.session.authenticated,
        });
    }
    if (inputPassword.trim().length == 0) {
        return res.render('signup', {
            warning: 'Password is not valid.',
            logIn: req.session.authenticated,
        });
    }

    // Check in database if there is similar username
    let sql = `SELECT username
                FROM Users
                WHERE username = ?`;

    const [rows] = await conn.query(sql, [inputUsername]);

    if (rows.length > 0) {
        return res.render('signup', {
            warning: 'Username already exists.',
            logIn: req.session.authenticated,
        });
    }

    // add new user into database and store userId into session
    sql =  `INSERT INTO Users
            (username, password)
            VALUES (?, ?)`;
    let params = [inputUsername, inputPassword];
    await conn.query(sql, params);

    sql =  `SELECT *
            FROM Users
            WHERE username = ?`;

    const [user] = await conn.query(sql, [inputUsername]);

    req.session.user = user[0];

    // Go to main page (or MyProfile page)
    req.session.authenticated = true;
    return res.redirect('/');
});

// route to login page
app.get('/login', (req, res) => {
    // if user is not login
    if (!req.session.authenticated) {
        res.render('login', {
            warning: null,
            logIn: false,
        });
    } else {
        // if login, redirect to MyProfile page
        res.redirect('/user/profile');
    }
});

app.post('/login', async (req, res) => {
    let inputUsername = req.body.username;
    let inputPassword = req.body.password;

    // select all so we get the user id too
    let sql = `SELECT *
                FROM Users
                WHERE username = ? AND password = ?`;

    const [rows] = await conn.query(sql, [inputUsername, inputPassword]);

    // return to main page after logging in
    // if not correct, stay at login page and stage the error
    if (rows.length > 0) {
        req.session.authenticated = true;
        // save user object
        // we want the whole user object
        req.session.user = rows[0];
        return res.redirect('/');
    } else {
        return res.render('login', {
            warning: 'Invalid username or password.',
            logIn: false
        });
    }
});

// route to logout and back to main page (landing page)
app.get('/logout', isAuthenticated, (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// function to know if the user is login or not
function isAuthenticated(req, res, next) {
    if (!req.session.authenticated) {
        res.redirect('/');
    } else {
        next();
    }
}

//---------------------------------------------

/*
    Routes for Review
*/
app.get('/addReview', async (req, res) => {
    // TODO: get the whole list of books in database to display

    res.render('addReview', {
        logIn: req.session.authenticated,
        warning: null,
    });
});

app.post('/api/addReview/:id', async (req, res) => {
    // Receive and convert information
    let userId = req.session.user.userId;
    let bookId = req.params.id;
    const { bookTitle, rating, review, spoilerCheckbox } = req.body;
    const isSpoiler = spoilerCheckbox === 'true';
    const ratingValue = parseInt(rating);

    // check for book in DB to add
    let bookSQL = `SELECT * FROM Book WHERE bookId = ?`;
    const [bookRows] = await conn.query(bookSQL, [bookId]);

    if (bookRows.length === 0) {
        const bookResult = await conn.query(
            'INSERT INTO Book (bookId, title) VALUES (?, ?)',
            [bookId, bookTitle]
        );

        console.log('Book inserted:', bookResult);
    }

    // Add review into database
    let sql = `INSERT INTO Review
                (userId, bookId, reviewText, rating, containsSpoiler)
                VALUES (?, ?, ?, ?, ?)`;
    let params = [userId, bookId, review, ratingValue, isSpoiler];
    const [rows] = await conn.query(sql, params);
    console.log(rows);

    res.redirect(`/books/${bookId}`);
});

//---------------------------------------------

/*
    Routes for Book Detail
*/

app.get('/books/:id', async (req, res) => {
    let bookID = req.params.id;
    const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${bookID}`
    );
    const data = await response.json();

    // fetch the reviews
    let sql =  `SELECT *
                FROM Review r
                JOIN Users u ON r.userId = u.userId
                WHERE r.bookId = ?`
    let params = [bookID];

    let [reviewRows] = await conn.query(sql, params);
    let bookDetail = data.volumeInfo;
    return res.render('bookDetails', {
        logIn: req.session.authenticated,
        book: bookDetail,
        bookId: data.id,
        reviews: reviewRows
    });
});

//---------------------------------------------

// User Profile Page - Displays user info and their reviews
app.get('/user/profile', async (req, res) => {
    // authentication check
    if (!req.session.authenticated) {
        return res.redirect('/login');
    }

    // get logged in user's ID from session
    const loggedInUserId = req.session.user.userId;

    // fetch all reviews for user
    let sql = `SELECT reviewText, rating, title, reviewId, Book.bookId, containsSpoiler
                   FROM Review
                   JOIN Book ON Review.bookId = Book.bookId
                   WHERE Review.userId = ?`;

    const [reviews] = await conn.query(sql, [loggedInUserId]);

    // fetch additional book info from Google Books API for each review
    const reviewsWithBookInfo = await Promise.all(
        reviews.map(async function (review) {
            let url = `https://www.googleapis.com/books/v1/volumes/${review.bookId}?key=AIzaSyAl2mrngXoYXq4S7MLXCU_SZnFuQD0kweY`; // Replace with your actual key
            try {
                let response = await fetch(url);
                let data = await response.json();
                review.bookInfo = {
                    thumbnail: data.volumeInfo?.imageLinks?.thumbnail || null,
                    authors: data.volumeInfo?.authors || [],
                };
            } catch (apiErr) {
                console.error(`API Error for bookId ${review.bookId}:`, apiErr);
                review.bookInfo = null; // Ensure bookInfo exists even if API fails
            }
            return review;
        })
    );

    res.render('userProfile', {
        user: req.session.user, // The logged-in user's info
        reviews: reviewsWithBookInfo, // The array of their reviews
        logIn: req.session.authenticated,
    });
});

app.post('/review/edit', async function (req, res) {
    // authentiation check
    if (!req.session.authenticated) {
        return res.redirect('/login');
    }

    let containsSpoiler = req.body.isSpoiler ? 1 : 0;

    let sql = `UPDATE Review
               SET reviewText = ?,
                   rating = ?,
                   containsSpoiler = ?
               WHERE reviewId = ?`;

    let params = [
        req.body.updatedReview,
        req.body.updatedRating,
        containsSpoiler,
        req.body.reviewId,
    ];

    await conn.query(sql, params);
    res.redirect('/user/profile');
});

app.get('/review/delete', async (req, res) => {
    // authentication check
    if (!req.session.authenticated) {
        return res.redirect('/login');
    }

    let reviewId = req.query.reviewId;

    let sql = `DELETE FROM Review 
                WHERE reviewId = ?`;

    await conn.query(sql, [reviewId]);

    res.redirect('/user/profile');
});

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
