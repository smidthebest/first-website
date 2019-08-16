var mysql = require("mysql");
var express = require('express');
var app = express();
var path = require('path');
app.set("view engine", "pug");
app.set("first-website", path.join(__dirname, "first-website"));
var fs = require('fs');



var finEmail = "";
var users = {};
app.get('/', function(req, res) {
    res.redirect("login.html");
})
app.get('/require.js', function(req, res) {
    res.sendfile(__dirname + "/require.js");
})
app.use(express.static('public'));
app.get('/login.html', function(req, res) {
    res.sendFile(__dirname + "/" + "login.html");
})

app.use(express.static(path.join(__dirname, 'public2')));
app.get('/chat.html', function(req, res) {
    if (finEmail == "") res.redirect("login.html");
    else res.render('chat.ejs');
})

app.get('/signup.html', function(req, res) {
    res.sendFile(__dirname + "/signup.html");
})

app.get('/loginicp.html', function(req, res) {
    res.sendFile(__dirname + "/loginicp.html");
});
app.get('/signupaae.html', function(req, res) {
    res.sendFile(__dirname + "/signupaae.html");
});
app.get('/loginade.html', function(req, res) {
    res.sendFile(__dirname + "/loginade.html");
});


var pool = mysql.createPool({
    connectionLimit: 10,
    connectTimeout: 60 * 60 * 1000,
    aquireTimeout: 60 * 60 * 1000,
    timeout: 60 * 60 * 1000,
    host: "database-1.ccgm7f9goesu.us-west-1.rds.amazonaws.com",
    user: "admin",
    password: "siddhartha",
    database: "mydb",
    port: 3306
});

app.get('/process_signup', function(req, res) {
    var email = req.query.first_name;
    var pass = req.query.last_name;

    response = "('" + email + "', '" + pass + "')";

    pool.getConnection(function(err, con) {
        if (err) throw err;
        var sql = "INSERT INTO users (email, password) VALUES " + response;
        con.query("SELECT * FROM users WHERE email = '" + email + "'", function(err, result) {
            if (err) throw err;
            if (result.length == 0) {
                con.query(sql, function(err, result) {
                    if (err) throw err;
                });
                finEmail = email;
                con.query("CREATE TABLE mydb." + finEmail + " (num int, name varchar(255), data longtext, dt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)", function(err, result) {
                    if (err) throw err;

                });

                res.redirect("chat.html");
            } else {

                res.redirect("signupaae.html");
            }
        })
        con.release();

    })



})

app.get('/process_get', function(req, res) {
    // Prepare output in JSON format
    var email = req.query.first_name;
    var pass = req.query.last_name;

    response = "('" + req.query.first_name + "', '" + req.query.last_name + "')";

    var check = true;
    pool.getConnection(function(err, con) {
        if (err) throw err;
        var sql = "INSERT INTO users (email, password) VALUES " + response;
        con.query("SELECT * FROM users WHERE email = '" + email + "'", function(err, result) {
            if (err) throw err;
            if (result.length != 0) {

                if (result[0].password != pass) {
                    res.redirect("loginicp.html");
                } else {
                    finEmail = email;
                    res.redirect("chat.html");
                    /*
                    This has to be moved!!
                    */
                }
            } else {
                res.redirect("loginade.html");
            }
        });
        con.release();
    });



})

var msgs = []


var server = app.listen(8081, function() {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})

var io = require('socket.io').listen(server);
io.on("connection", function(socket) {
    socket.on('username', function(username) {
        const keys = Object.keys(users);
        if (keys.includes(finEmail)) {
            socket.emit("redirect");
            return;
        }

        keys.forEach(function(key) {
            users[key].emit('logged_on', finEmail);
        });

        users[finEmail] = socket;
        socket.username = finEmail;
        socket.emit('set_name', finEmail);

        pool.getConnection(function(err, con) {
            if (err) throw err;

            con.query("SELECT email FROM users", function(err, result) {
                if (err) throw err;
                var temp = [
                    []
                ];
                for (var i = 0; i < result.length; i++) {
                    if (Object.keys(users).includes(result[i].email)) {
                        temp.push([result[i].email, 1]);
                    } else {
                        temp.push([result[i].email, 0]);
                    }
                }
                socket.emit('data', temp, socket.username);

            });
            con.release();
        });

    });

    socket.on('disconnect', function() {
        if (!(socket.partner in users)) {
            delete users[socket.username];

            Object.keys(users).forEach(function(key) {
                users[key].emit('logged_off', socket.username);
            });
            return;
        }

        users[socket.partner].emit('left', socket.username);
        delete users[socket.username];
        Object.keys(users).forEach(function(key) {
            users[key].emit('logged_off', socket.username);
        });
    });

    socket.on('chat_message', function(message) {
        if (socket.partner == "") {
            socket.emit('no_partner');
            return;
        }
        if (users[socket.partner] != null && users[socket.partner].partner == socket.username) {
            users[socket.partner].emit('chat_message', message, socket.username);
        }

        processMsgs(socket.username, message, socket.partner);
    });

    socket.on('found_part', function(username) {
        socket.emit('clear');
        socket.partner = username;

        pool.getConnection(function(err, con) {
            if (err) throw err;

            var firstData = [];
            con.query("SELECT data, dt FROM " + socket.username + " WHERE name ='" + socket.partner + "'", function(err, result) {
                if (err) throw err;
                firstData = result;

                var secondData = [];
                //🔵

                con.query("SELECT data, dt FROM " + socket.partner + " WHERE name ='" + socket.username + "'", function(err, result) {
                    if (err) throw err;
                    secondData = result;
                    socket.emit('is_online', username, socket.username, firstData, secondData);
                    if (socket.partner in users && users[socket.partner].partner == socket.username) users[socket.partner].emit("joined", socket.username);
                });
            });
            con.release();
        });
    });
});

function processMsgs(username, msgs, partner) {
    pool.getConnection(function(err, con) {
        if (err) throw err;

        msgs = msgs.replace(/'/g, "''");
        msgs = msgs.replace(/"/g, '""');
        var sql = "INSERT INTO " + username + " ( name, data) VALUES ('" + partner + "', '" + msgs + "')";

        con.query(sql, function(err, result) {
            if (err) throw err;
        });

        con.release();
    });
}