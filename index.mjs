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

// routes
// NOTE: req.session.authenticated may be undefined (False) on the first visit

app.get("/", (req, res) => {
    res.render("index", { logIn: req.session.authenticated });
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

    // TODO: add new user into database and store userId into session

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
        // temporary route back to main
        res.render('index', { warning: null,
                            logIn: req.session.authenticated,
        });
    }
});

app.post('/login', async(req, res) =>{
    let inputUsername = req.body.username;
    let inputPassword = req.body.password;
    
    let sql = `SELECT *
                FROM Users
                WHERE username = ? AND password = ?`;
                
    const [rows] = await conn.query(sql, [inputUsername, inputPassword]);
    
    // return to main page after logging in
    // if not correct, stay at login page and stage the error
    if(rows.length > 0){
        req.session.authenticated = true;
        req.session.userId = rows[0].userId;

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
app.post('/api/addReview/:id', async(req, res)=>{
    // Receive and convert information
    let userId = req.session.userId;
    let bookId = req.params.id;
    const {bookTitle, rating, review, spoilerCheckbox} = req.body;
    const isSpoiler = (spoilerCheckbox === 'true');
    const ratingValue = parseInt(rating);

    // check for book in DB to add
    let bookSQL = `SELECT * FROM Book WHERE bookId = ?`;
    const [bookRows] = await conn.query(bookSQL, [bookId]);
    
    if(bookRows.length === 0){
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
    const [rows] = await conn.query(sql,params);
    console.log(rows);

    res.redirect(`/books/${bookId}`)
});

//---------------------------------------------


/*
    Routes for Book Detail
*/

    app.get('/books/:id', async(req, res)=>{
        let bookID = req.params.id;
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookID}`);
        const data = await response.json();
        
        // TODO: fetch the reviews
        let reviewRows = [];
        let bookDetail = data.volumeInfo;
        return res.render('bookDetails', { logIn: req.session.authenticated,
                                        book: bookDetail,
                                        bookId: data.id,
                                        reviews: reviewRows,                                     
        })    
    });

//---------------------------------------------

// User Review Page

app.get('/user/reviews', async (req, res) => {
    let sql =  `SELECT username, reviewText, rating, title, reviewId, Book.bookId, containsSpoiler
                FROM Users
                JOIN Review ON Users.userId = Review.userId
                JOIN Book ON Review.bookId = Book.bookId
                WHERE Users.userId = ?`;
    let sqlParams = 1;
    const [rows] = await conn.query(sql, sqlParams);

    const reviewsWithBookInfo = await Promise.all(rows.map(async function(review){
        let url = `https://www.googleapis.com/books/v1/volumes/${review.bookId}?key=AIzaSyAl2mrngXoYXq4S7MLXCU_SZnFuQD0kweY`;
        try{
            let response = await fetch(url);
            let data = await response.json();

            review.bookInfo = {
                thumbnail: data.volumeInfo?.imageLinks?.thumbnail || null,
                authors: data.volumeInfo?.authors || [],
            };

        } catch(err) {
            console.error(`Error fetching book info for ID ${review.bookId}:`, err);
            review.bookInfo = null;
        }
        return review;
    }));
    res.render("viewUserReviews",{"reviews": reviewsWithBookInfo});
});

app.post("/review/edit", async function(req, res){
    let containsSpoiler = req.body.isSpoiler ? 1 : 0;

    let sql = `UPDATE Review
                SET reviewText = ?,
                    rating = ?,
                    containsSpoiler = ?
                WHERE reviewId =  ?`;


    let params = [req.body.updatedReview,  
                req.body.updatedRating, containsSpoiler, req.body.reviewId];         
    const [rows] = await conn.query(sql,params);
    res.redirect("viewUserReviews");
});

app.get("/review/delete", async function(req, res){
    let reviewId = req.query.reviewId;


    let sql = `DELETE 
            FROM Review
            WHERE reviewId = ?`;
        
    const [rows] = await conn.query(sql, [reviewId]);

    res.redirect("viewUserReviews");
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
