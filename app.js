const express = require("express");
const app = express();
const serverPort = 8080;

app.use(express.json({extended: true}));
var bodyParser = require('body-parser');

app.use(bodyParser.json());     
app.use(express.urlencoded());

app.use('/static', express.static('static'));
app.use('/static/lang', express.static('lang'));

const fs = require('fs');
var path = require('path');
var glob = require( 'glob' );
var language_dict = {};

app.engine('pug', require('pug').__express)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


//Start Server  
const server = app.listen(serverPort, () => {
    glob.sync( 'static/lang/*.json' ).forEach( function( file ) {
        let dash = file.split("/");
        if(dash.length == 3) {
            let dot = dash[2].split(".");
          if(dot.length == 2) {
            let lang = dot[0];

            fs.readFile(file, function(err, data) {
              language_dict[lang] = JSON.parse(data.toString());
            });
        }
        }
      });
    console.log('App running on http://localhost:'+serverPort);
});

// Renders
app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *");
});

app.get('/',(req,res) => {
    res.render('index', language_dict.de);
  });
app.get('/de',(req,res) => {
    res.render('index', language_dict.de);
}); 
app.get('/en',(req,res) => {
    res.render('index', language_dict.en);
});

//Websocket
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:8100",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});

io.on('connection', function(socket) {
    var userId = socket.id;
    console.log('joined: '+userId);
    socket.on('move', function(data){
        io.sockets.emit('moveTo', {id: userId,x:data.x, y:data.y});
    }); 
    socket.on('meeting', function(dataMeeting){
        console.log(dataMeeting)
        io.sockets.emit('meetingSend', {x: dataMeeting.x, y: dataMeeting.y } );
    }); 
    socket.on('disconnecting', function(socket){
        io.sockets.emit('left', userId);
    });
});