var mysql = require("mysql");
var express = require('express');
var app = express();
var path = require('path'); 
app.set("view engine", "pug"); 
app.set("FirstWebsite", path.join(__dirname, "FirstWebsite")); 
var fs = require('fs');



var finEmail = ""; 


app.get('/require.js', function(req, res){
    res.sendfile(__dirname + "/require.js"); 
})
app.use(express.static('public'));
app.get('/login.html', function (req, res) {
   res.sendFile( __dirname + "/" + "login.html" );
})

app.use(express.static(path.join(__dirname, 'public2'))); 
app.get('/chat.html', function(req, res) {
    if(finEmail == "") res.redirect("login.html");
    else res.render('chat.ejs');
})

app.get('/signup.html', function(req, res) {
    res.sendFile(__dirname + "/signup.html"); 
})

var con = mysql.createPool({
    host: "localhost", 
    user: "root",
    password: "Firstserver1",
    database: "mydb"
});


app.get('/process_signup', function(req, res){
    var email = req.query.first_name; 
    var pass = req.query.last_name; 

    response = "('" + email + "', '" + pass +"')";

    con.getConnection(function(err){
        if(err) throw err; 
        var sql = "INSERT INTO users (email, password) VALUES " + response;
        con.query("SELECT * FROM users WHERE email = '" + email +"'", function(err, result) {
            if(err) throw err; 
            if(result.length == 0){
                con.query(sql, function (err, result) {
                    if (err) throw err;
                });
                var querystring = encodeURIComponent(email); 
                finEmail = email; 
                con.query("CREATE TABLE mydb." +finEmail +" (num int, name varchar(255), data longtext)", function(err, result) {
                    console.log(result); 
                    if(err) throw err; 

                }) ; 
                
                res.redirect("chat.html"); 
            }
            else {
                
                console.log("Username already exists. Please try a new one.");
            }
        })

    })

   

})

app.get('/process_get', function (req, res) {
   // Prepare output in JSON format
   var email = req.query.first_name; 
   var pass = req.query.last_name; 

   response = "('" + req.query.first_name + "', '" + req.query.last_name +"')";
   
   var check = true;  
   con.getConnection(function(err) {
    if (err) throw err;
    var sql = "INSERT INTO users (email, password) VALUES " + response;
    con.query("SELECT * FROM users WHERE email = '" + email +"'", function(err, result) {
        if(err) throw err; 
        if(result.length != 0) {
            
            if(result[0].password != pass){
                console.log("You inputed the wrong password."); 
            }
            else {
                var querystring = encodeURIComponent(email); 
                finEmail = email; 
                res.redirect("chat.html"); 
                /*
                This has to be moved!!
                */
            }
        }
        else{
            console.log("You have not created an account"); 
        }
    });
    
  }); 

  
 
})



var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    
    console.log("Example app listening at http://%s:%s", host, port)
 })
 
 var io = require('socket.io').listen(server); 
 io.on("connection", function(socket) {
    socket.on('username', function(username) {
        socket.username = finEmail;
        
        con.getConnection(function(err){
            if(err) throw err; 
            con.query("SELECT data FROM " + socket.username , function(err, result){
                if(err) throw err; 
                io.emit('is_online', result);
            });
        })
    });

    socket.on('disconnect', function(username) {
        io.emit('is_online', '🔴 <i>' + socket.username + ' left the chat..</i>');
    })

    socket.on('chat_message', function(message) {
        io.emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message);
        con.getConnection(function(err) {
            if(err) throw err; 
            var sql = "INSERT INTO " + socket.username + " (num, name, data) VALUES " + "(1, 'null', '" + message + "')";
            con.query(sql, function(err, result){
                if (err) throw err; 
            });
        });
    });

    con.getConnection(function(err) {
        if (err) throw err;
    
        con.query("SELECT email FROM hi", function (err, result, fields) {
            if (err) throw err;
            io.emit('data', result); 
        });
    }); 

 });
 
