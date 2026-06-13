const express=require('express');
const path=require('path');
const db=require('./db');
const session=require('express-session');

const app=express();
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));

app.use(
    session({
        secret:"librarysecret",
        resave:false,
        saveUninitialized:false
        })  
);

app.get('/',(req,res)=>{
    res.render("login",{error:null});
});

app.post('/login',(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    console.log(email,password);
    db.get(`SELECT * FROM Librarians WHERE email=? AND password=?`,[email,password],(err,row)=>{
        if(row){
            req.session.librarian=row;
            console.log(req.session.librarian);
            res.redirect('/dashboard');
        }else{
            res.render('login',{error:"Invalid Credentials"});
        }
    });
});

function isLoggedIn(req,res,next){
    if(req.session.librarian){
        next();
    }else{
        res.redirect('/');
    }
};

app.get('/dashboard',isLoggedIn,(req,res)=>{

    db.get(`SELECT count(*) as totalBooks FROM Books`,(err, books)=>{
        db.get(`select count(*) as totalBorrowed from BorrowedBooks`,(err,borrowed)=>
        {
            db.get(`select count(*) as totalVisits from LibraryVisits`,(err,visits)=>{
                res.render("dashboard",{
                    librarian:req.session.librarian,
                    totalBooks:books.totalBooks,
                    totalBorrowed:borrowed.totalBorrowed,
                    totalVisits:visits.totalVisits

                })
            })
        })
    })
});

app.get('/books',(req,res)=>{
    db.all(`SELECT * FROM Books`,(err,rows)=>{
        res.render("books",{books:rows});
    });
});

app.get('/addbooks',(req,res)=>{
    res.render("addbooks");
    

});

app.post('/addbooks',(req,res)=>{
    const title=req.body.title;
    const author=req.body.author;
    const quantity=req.body.quantity;

    db.run(`INSERT INTO Books (title, author, quantity) VALUES (?, ?, ?)`, [title, author, quantity],(err)=> {
        if (err) {
           console.log(err.message);
        } else {
            res.redirect('books');
        }
    });
});

app.get('/books/delete/:id', (req, res) => {
    const id = req.params.id;

    db.run(
        'DELETE FROM Books WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.log(err.message);
            }

            res.redirect('/books');
        }
    );
});

app.get('/books/edit/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM Books WHERE id = ?',
        [id],
        (err, book) => {

            if (err || !book) {
                return res.redirect('/books');
            }

            res.render('editBook', {
                book: book
            });
        }
    );
});

app.post('/books/edit/:id', (req, res) => {

    const id = req.params.id;

    const { title, author, quantity } = req.body;

    db.run(
        `UPDATE Books
         SET title = ?, author = ?, quantity = ?
         WHERE id = ?`,
        [title, author, quantity, id],
        (err) => {

            if (err) {
                console.log(err.message);
            }

            res.redirect('/books');
        }
    );
});

app.get('/students', (req, res) => {

    db.all(
        'SELECT * FROM Students',
        (err, rows) => {

            res.render('students', {
                students: rows
            });
        }
    );
});

app.get('/students/add', (req, res) => {
    res.render('addStudent');
});

app.post('/students/add', (req, res) => {

    const { usn, name, branch } = req.body;

    db.run(
        'INSERT INTO Students VALUES(?,?,?)',
        [usn, name, branch],
        (err) => {

            if(err){
                console.log(err.message);
            }

            res.redirect('/students');
        }
    );
});

app.get('/borrowed', (req, res) => {

    const sql = `
        SELECT
            BorrowedBooks.id,
            Students.name AS student_name,
            Books.title AS book_title,
            BorrowedBooks.borrowed_date,
            BorrowedBooks.return_date,
            BorrowedBooks.status

        FROM BorrowedBooks

        JOIN Students
        ON BorrowedBooks.usn = Students.usn

        JOIN Books
        ON BorrowedBooks.book_id = Books.id
    `;

    db.all(sql, (err, rows) => {

        res.render('borrowedBooks', {
            borrowedBooks: rows
        });

    });

});

app.get('/borrowed/add',(req,res)=>{

    db.all(
        'SELECT * FROM Students',
        (err, students)=>{

            db.all(
                'SELECT * FROM Books',
                (err, books)=>{

                    res.render(
                        'addborrowBook',
                        {
                            students,
                            books
                        }
                    );

                }
            );

        }
    );

});

app.post('/borrowed/add',(req,res)=>{

    const {
        usn,
        book_id,
        borrowed_date,
        return_date
    } = req.body;

    db.run(
        `INSERT INTO BorrowedBooks
        (
            usn,
            book_id,
            borrowed_date,
            return_date,
            status
        )
        VALUES(?,?,?,?,?)`,
        [
            usn,
            book_id,
            borrowed_date,
            return_date,
            'Borrowed'
        ],
        (err)=>{

            if(err){
                console.log(err.message);
            }

            res.redirect('/borrowed');

        }
    );
    db.run(
        `UPDATE Books
        SET quantity = quantity - 1
        WHERE id=?`,
        [book_id]
    );
});

app.get('/students/edit/:usn', (req, res) => {

    db.get(
        'SELECT * FROM Students WHERE usn=?',
        [req.params.usn],
        (err, student) => {

            if(err || !student){
                return res.redirect('/students');
            }

            res.render('editStudent',{
                student
            });

        }
    );

});

app.post('/students/edit/:usn', (req, res) => {

    const { name, branch } = req.body;

    db.run(
        `UPDATE Students
         SET name=?, branch=?
         WHERE usn=?`,
        [
            name,
            branch,
            req.params.usn
        ],
        (err)=>{

            if(err){
                console.log(err.message);
            }

            res.redirect('/students');

        }
    );

});

app.get('/students/delete/:usn',(req,res)=>{

    db.run(
        'DELETE FROM Students WHERE usn=?',
        [req.params.usn],
        ()=>{
            res.redirect('/students');
        }
    );

});

app.get('/borrowed/edit/:id',(req,res)=>{

    db.get(
        'SELECT * FROM BorrowedBooks WHERE id=?',
        [req.params.id],
        (err, borrowed)=>{

            db.all(
                'SELECT * FROM Students',
                (err, students)=>{

                    db.all(
                        'SELECT * FROM Books',
                        (err, books)=>{

                            res.render(
                                'editBorrowedBook',
                                {
                                    borrowed,
                                    students,
                                    books
                                }
                            );

                        }
                    );

                }
            );

        }
    );

});

app.post('/borrowed/edit/:id',(req,res)=>{

    const {
        usn,
        book_id,
        borrowed_date,
        return_date,
        status
    } = req.body;

    db.run(
        `UPDATE BorrowedBooks
         SET usn=?,
             book_id=?,
             borrowed_date=?,
             return_date=?,
         WHERE id=?`,
        [
            usn,
            book_id,
            borrowed_date,
            return_date,
            req.params.id
        ],
        (err)=>{

            if(err){
                console.log(err.message);
            }

            res.redirect('/borrowed');

        }
    );

});

app.get('/borrowed/return/:id',(req,res)=>{

    const borrowId = req.params.id;

    db.get(
        'SELECT * FROM BorrowedBooks WHERE id=?',
        [borrowId],
        (err, borrowRecord)=>{

            if(err || !borrowRecord){
                return res.redirect('/borrowed');
            }

            db.run(
                `UPDATE BorrowedBooks
                 SET status='Returned'
                 WHERE id=?`,
                [borrowId]
            );

            db.run(
                `UPDATE Books
                 SET quantity = quantity + 1
                 WHERE id=?`,
                [borrowRecord.book_id]
            );

            res.redirect('/borrowed');

        }
    );

});

app.get('/visits', (req,res)=>{

    const sql=`
    SELECT
        LibraryVisits.*,
        Students.name
    FROM LibraryVisits
    LEFT JOIN Students
    ON LibraryVisits.usn = Students.usn
    ORDER BY id DESC
    `;

    db.all(sql,(err,rows)=>{

        res.render('visits',{
            visits:rows
        });

    });

});

app.get('/visits/add',(req,res)=>{

    db.all(
        'SELECT * FROM Students',
        (err,students)=>{

            res.render(
                'addVisit',
                {students}
            );

        }
    );

});

app.post('/visits/add',(req,res)=>{

    const usn=req.body.usn;

    const now=new Date();

    db.run(
        `INSERT INTO LibraryVisits
        (
            usn,
            entry_time
        )
        VALUES (?,?)`,
        [
            usn,
            now.toISOString()
        ],
        (err)=>{

            if(err){
                console.log(err.message);
            }

            res.redirect('/visits');

        }
    );

});

app.get('/visits/exit/:id',(req,res)=>{

    const id=req.params.id;

    db.get(
        `SELECT * FROM LibraryVisits
         WHERE id=?`,
        [id],
        (err,visit)=>{

            const exitTime=new Date();

            const entryTime=
                new Date(visit.entry_time);

            const diff=
                exitTime-entryTime;

            const hours=
                Math.floor(
                    diff/(1000*60*60)
                );

            const minutes=
                Math.floor(
                    (diff%(1000*60*60))
                    /(1000*60)
                );

            const duration=
                `${hours}h ${minutes}m`;

            db.run(
                `UPDATE LibraryVisits
                 SET exit_time=?,
                     duration=?
                 WHERE id=?`,
                [
                    exitTime.toISOString(),
                    duration,
                    id
                ],
                ()=>{

                    res.redirect('/visits');

                }
            );

        }
    );

});

app.get('/visits/delete/:id',(req,res)=>{

    db.run(
        'DELETE FROM LibraryVisits WHERE id=?',
        [req.params.id],
        ()=>{

            res.redirect('/visits');

        }
    );

});

app.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/');
    });
});

app.listen(5000,()=>{
    console.log('Server is running......');
});