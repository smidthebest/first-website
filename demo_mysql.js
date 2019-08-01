var mysql = require("mysql");
var express = require('express');
var app = express();
var fs = require('fs');

app.use(express.static('public'));
app.get('/expresshtm.html', function (req, res) {
   res.sendFile( __dirname + "/" + "expresshtm.html" );
})

app.get('/index.html', function(req, res) {
    res.sendFile(__dirname + "/index.html"); 
})

var con = mysql.createPool({
    host: "localhost", 
    user: "root",
    password: "Firstserver1",
    database: "mydb"
});

var data = [];
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
        if(result.length == 0) check = false; 
        
        if(!check){
            con.query(sql, function (err, result) {
                if (err) throw err;
                
            });
        }
    });
    
  }); 

  res.redirect("index.html");
 
})

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})




